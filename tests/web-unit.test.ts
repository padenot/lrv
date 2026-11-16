import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ReviewNoteManager, acceptedBody, type ReviewNote } from '../web/src/review-notes';
import { acceptedNoteEntries, isAcceptRequest } from '../web/src/comments';
import {
  loadCommentDraft,
  saveCommentDraft,
  syncCommentDraftToServer,
} from '../web/src/comment-draft-storage';

const original: ReviewNote = {
  id: 'finding',
  file: 'a.txt',
  line: 1,
  side: 'new',
  body: 'Original finding',
};

function manager() {
  const notes = new ReviewNoteManager();
  notes.setNotes([original]);
  return notes;
}

test('accepted edit survives refresh and restore without modifying the original body', () => {
  const notes = manager();
  notes.updateNote(original, { disposition: 'accepted', accepted_body: 'Replacement' });
  assert.deepEqual(notes.getEdits(), { finding: 'Replacement' });
  notes.setNotes([original]);
  assert.equal(acceptedBody(notes.getNotes()[0]!), 'Replacement');
  assert.equal(notes.getNotes()[0]!.body, original.body);
  const restored = manager();
  restored.applyDispositions(notes.getDispositions(), notes.getEdits());
  assert.equal(acceptedBody(restored.getNotes()[0]!), 'Replacement');
  const copy = restored.getEdits();
  copy.finding = 'Mutated';
  assert.equal(restored.getEdits().finding, 'Replacement');
  restored.applyDispositions({ finding: 'accepted' });
  assert.equal(acceptedBody(restored.getNotes()[0]!), original.body);
});

test('Undo and Ignore discard edits, including when an edit is supplied with the transition', () => {
  for (const disposition of ['open', 'ignored'] as const) {
    const notes = manager();
    notes.updateNote(original, { disposition: 'accepted', accepted_body: 'Replacement' });
    notes.updateNote(original, { disposition, accepted_body: 'Another edit' });
    assert.deepEqual(notes.getEdits(), {});
    assert.equal(notes.getNotes()[0]!.disposition, disposition);
    assert.equal(acceptedBody(notes.getNotes()[0]!), original.body);
  }
});

test('unchanged or undefined text removes the body override', () => {
  for (const accepted_body of [original.body, undefined]) {
    const notes = manager();
    notes.updateNote(original, { disposition: 'accepted', accepted_body: 'Replacement' });
    notes.updateNote(original, { accepted_body });
    assert.deepEqual(notes.getEdits(), {});
    assert.equal(notes.getNotes()[0]!.accepted_body, undefined);
    assert.equal(notes.getNotes()[0]!.disposition, 'accepted');
  }
});

test('Finish uses edited text while preserving the note link and empty acceptance body', () => {
  const notes = manager();
  notes.updateNote(original, { disposition: 'accepted', accepted_body: 'Replacement' });
  const [entry] = acceptedNoteEntries(notes.getNotes());
  assert.equal(entry!.body, '');
  assert.equal(entry!.in_reply_to!.body, 'Replacement');
  assert.equal(entry!.in_reply_to!.id, original.id);
  assert.equal(isAcceptRequest(entry!), true);
});

// A minimal asynchronous IndexedDB transport: these tests exercise draft records,
// sanitization and deletion; browser IndexedDB persistence is covered by Playwright.
const records = new Map<string, unknown>();
const db = {
  transaction() {
    const tx = {
      oncomplete: null as (() => void) | null,
      objectStore() {
        const request = (action: () => unknown) => {
          const result = { result: undefined as unknown, onsuccess: null as (() => void) | null };
          setTimeout(() => {
            result.result = action();
            result.onsuccess?.();
            tx.oncomplete?.();
          }, 0);
          return result;
        };
        return {
          get: (key: string) => request(() => structuredClone(records.get(key))),
          put: (record: { key: string }) =>
            request(() => records.set(record.key, structuredClone(record))),
          delete: (key: string) => request(() => records.delete(key)),
        };
      },
    };
    return tx;
  },
};
Object.defineProperty(globalThis, 'indexedDB', {
  value: {
    open() {
      const request = { result: db, onsuccess: null as (() => void) | null };
      setTimeout(() => request.onsuccess?.(), 0);
      return request;
    },
  },
});

test('draft edits round-trip, sanitize invalid values and keep an otherwise empty draft', async () => {
  await saveCommentDraft('edited', [], { finding: 'accepted' }, { finding: 'Replacement' });
  assert.deepEqual(await loadCommentDraft('edited'), {
    comments: [],
    dispositions: { finding: 'accepted' },
    note_edits: { finding: 'Replacement' },
  });
  await saveCommentDraft('only-edits', [], {}, { finding: 'Replacement' });
  assert.equal((await loadCommentDraft('only-edits')).note_edits.finding, 'Replacement');
  const record = records.get('edited') as { note_edits: unknown };
  record.note_edits = { finding: 'Replacement', invalid: 42 };
  assert.deepEqual((await loadCommentDraft('edited')).note_edits, { finding: 'Replacement' });
  record.note_edits = undefined;
  assert.deepEqual((await loadCommentDraft('edited')).note_edits, {});
  await saveCommentDraft('only-edits', [], {});
  assert.equal(records.has('only-edits'), false);
});

test('SQLite mirror receives the edited note body', async () => {
  const previous = globalThis.fetch;
  let payload: { notes: Array<{ note: ReviewNote; disposition: string }> };
  globalThis.fetch = async (_input, init) => {
    payload = JSON.parse(init!.body as string);
    return new Response(null, { status: 200 });
  };
  try {
    const notes = manager();
    notes.updateNote(original, { disposition: 'accepted', accepted_body: 'Replacement' });
    await syncCommentDraftToServer([], notes.getNotes());
    assert.equal(payload!.notes[0]!.note.body, 'Replacement');
    assert.equal(payload!.notes[0]!.disposition, 'accepted');
    assert.equal(notes.getNotes()[0]!.body, original.body);
  } finally {
    globalThis.fetch = previous;
  }
});
