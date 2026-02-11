#!/bin/bash
# Fix test files to include missing struct fields

# Fix DiffResponse: add commit fields after stats
sed -i '/stats: lrv::types::DiffStats {/,/},/{
  /},/{
    a\        commit_hash: None,\
        commit_author: None,\
        commit_date: None,\
        commit_message: None,
  }
}' tests/api_test.rs tests/context_title_test.rs tests/csp_test.rs tests/file_api_test.rs tests/server_test.rs

# Fix FileDiff: add blob fields after hunks
sed -i '/hunks: vec!\[\],/{
  a\            old_blob: None,\
            new_blob: None,
}' tests/api_test.rs tests/context_title_test.rs tests/csp_test.rs tests/file_api_test.rs tests/server_test.rs

# Fix AppState: add old_cache field
sed -i '/context: Arc::new/a\        old_cache: Arc::new(Mutex::new(HashMap::new())),' tests/api_test.rs tests/context_title_test.rs tests/csp_test.rs tests/file_api_test.rs tests/server_test.rs

# Fix create_router calls: add false as second argument
sed -i 's/lrv::server::create_router(state)/lrv::server::create_router(state, false)/g' tests/context_title_test.rs tests/csp_test.rs tests/file_api_test.rs tests/server_test.rs

echo "Test files fixed"
