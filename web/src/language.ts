function globPatternToRegExp(pattern: string): RegExp {
  const escaped = String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexBody = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${regexBody}$`, 'i');
}

export function detectLanguageFromPathAndContent(
  path: string | null | undefined,
  content: string | null | undefined,
): string {
  const normalizedPath = String(path || '')
    .replace(/\\/g, '/')
    .replace(/[?#].*$/, '');
  const baseName = normalizedPath.split('/').pop() || normalizedPath;
  const lowerPath = normalizedPath.toLowerCase();
  const lowerBase = baseName.toLowerCase();

  const fileNameMap: Record<string, string> = {
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    gnumakefile: 'makefile',
    'cmakelists.txt': 'cmake',
    gemfile: 'ruby',
    rakefile: 'ruby',
    pipfile: 'toml',
  };
  if (fileNameMap[lowerBase]) {
    return fileNameMap[lowerBase];
  }

  if (typeof monaco !== 'undefined' && monaco.languages.getLanguages) {
    const languages = monaco.languages.getLanguages() || [];
    for (const lang of languages) {
      if (!lang || !lang.id) {
        continue;
      }

      const fileNames = Array.isArray(lang.filenames) ? lang.filenames : [];
      if (fileNames.some((name) => String(name).toLowerCase() === lowerBase)) {
        return lang.id;
      }

      const extensions = Array.isArray(lang.extensions) ? lang.extensions : [];
      if (extensions.some((ext) => lowerPath.endsWith(String(ext).toLowerCase()))) {
        return lang.id;
      }

      const filePatterns = Array.isArray(lang.filenamePatterns) ? lang.filenamePatterns : [];
      if (
        filePatterns.some((pattern) => {
          try {
            const rx = globPatternToRegExp(pattern);
            return rx.test(baseName) || rx.test(normalizedPath);
          } catch (_) {
            return false;
          }
        })
      ) {
        return lang.id;
      }
    }
  }

  const extensionMap: Record<string, string> = {
    '.rs': 'rust',
    '.js': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.d.ts': 'typescript',
    '.py': 'python',
    '.md': 'markdown',
    '.mdx': 'markdown',
    '.json': 'json',
    '.jsonc': 'json',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.xml': 'xml',
    '.toml': 'toml',
    '.ini': 'ini',
    '.cfg': 'ini',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.fish': 'shell',
    '.sql': 'sql',
    '.go': 'go',
    '.java': 'java',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.php': 'php',
    '.rb': 'ruby',
    '.lua': 'lua',
    '.c': 'c',
    '.h': 'cpp',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.dart': 'dart',
    '.dockerfile': 'dockerfile',
  };

  for (const [ext, language] of Object.entries(extensionMap)) {
    if (lowerBase.endsWith(ext)) {
      return language;
    }
  }

  const firstLine = String(content || '')
    .split('\n', 1)[0]
    .toLowerCase();
  if (firstLine.startsWith('#!')) {
    if (
      firstLine.includes('bash') ||
      firstLine.includes('sh') ||
      firstLine.includes('zsh') ||
      firstLine.includes('fish')
    ) {
      return 'shell';
    }
    if (firstLine.includes('python')) {
      return 'python';
    }
    if (firstLine.includes('node') || firstLine.includes('deno')) {
      return 'javascript';
    }
    if (firstLine.includes('ruby')) {
      return 'ruby';
    }
    if (firstLine.includes('perl')) {
      return 'perl';
    }
  }

  return 'plaintext';
}
