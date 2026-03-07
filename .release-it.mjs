function getReleaseType(commits) {
  let hasBreaking = false
  let hasFeature = false
  let hasPatch = false

  for (const commit of commits) {
    const notes = commit.notes ?? []
    if (notes.some((note) => note.title === 'BREAKING CHANGE')) {
      hasBreaking = true
    }

    if (commit.type === 'feat' || commit.type === 'feature') {
      hasFeature = true
      continue
    }

    if (commit.type === 'fix' || commit.type === 'perf') {
      hasPatch = true
    }
  }

  if (hasBreaking || hasFeature) {
    return 'minor'
  }

  if (hasPatch) {
    return 'patch'
  }

  return null
}

export default {
  hooks: {
    // release-it only creates annotated tags itself; use a hook so CI pushes a
    // lightweight tag after a successful npm publish instead.
    'after:npm:release': ['git tag ${tagName}', 'git push origin ${tagName}'],
  },
  git: {
    commit: false,
    requireBranch: 'main',
    tag: false,
    tagName: 'v${version}',
    push: false,
  },
  github: {
    release: true,
    releaseName: '${tagName}',
  },
  npm: {
    allowSameVersion: true,
    ignoreVersion: true,
    publish: true,
    skipChecks: true,
  },
  plugins: {
    '@release-it/conventional-changelog': {
      infile: false,
      // Use the Conventional Commits preset so `feat!:`/`fix!:` are parsed as
      // breaking changes, then keep explicit major-zero bump semantics during
      // alpha: features and breakings both release as 0.x minors.
      preset: {
        name: 'conventionalcommits',
      },
      whatBump(commits) {
        const releaseType = getReleaseType(commits)

        if (!releaseType) {
          return null
        }

        if (releaseType === 'minor') {
          return {
            level: 1,
            reason: 'pre-1.0 release from feat or breaking change',
          }
        }

        return {
          level: 2,
          reason: 'patch release from fix or perf change',
        }
      },
    },
  },
}
