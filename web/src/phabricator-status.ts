import type { PhabRevisionStatus } from './types/app';

export const REVISION_STATE_CLASSES: Record<string, string> = {
  accepted: 'revision-accepted',
  'needs-review': 'revision-needs-review',
  'needs-revision': 'revision-waiting',
  'changes-planned': 'revision-waiting',
  draft: 'revision-waiting',
};

export const WAITING_ON_YOUR_REVIEW = 'Waiting on your review';

/** Keep the chip and strip wording consistent. Pending counts are reviewer entries,
 * including projects, rather than expanded project membership. */
export function reviewWaitingLabel(revision: PhabRevisionStatus): string | null {
  if (revision.my_review === 'waiting') {
    return 'waiting on your review';
  }
  if (revision.status === 'needs-review' && revision.reviewers_pending > 0) {
    return `waiting on ${revision.reviewers_pending} other${revision.reviewers_pending === 1 ? '' : 's'}`;
  }
  return null;
}
