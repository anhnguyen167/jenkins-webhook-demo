// Personal sandbox pipeline to test the Generic Webhook Trigger flow
// end-to-end: prints PR info for a pull_request event, commit info for a
// push event. Same logic as cicd/JenkinsfileMainTriggerWebhook in the
// Playwright repo, just standalone here for testing with full admin
// control (own repo, own Jenkins job, own PAT).

pipeline {
  agent {
    label 'self-hosted'
  }

  options {
    timeout(time: 5, unit: 'MINUTES')
    timestamps()
  }

  triggers {
    GenericTrigger(
      genericVariables: [
        [key: 'PR_NUMBER', value: '$.pull_request.number', defaultValue: ''],
        [key: 'PR_TITLE', value: '$.pull_request.title', defaultValue: ''],
        [key: 'PR_AUTHOR', value: '$.pull_request.user.login', defaultValue: ''],
        [key: 'PR_TARGET', value: '$.pull_request.base.ref', defaultValue: ''],
        [key: 'PR_URL', value: '$.pull_request.html_url', defaultValue: ''],
        [key: 'PUSH_COMMIT_ID', value: '$.head_commit.id', defaultValue: ''],
        [key: 'PUSH_COMMIT_MSG', value: '$.head_commit.message', defaultValue: ''],
        [key: 'PUSH_REF', value: '$.ref', defaultValue: '']
      ],
      genericHeaderVariables: [
        [key: 'X-GitHub-Event', regexpFilter: '']
      ],
      causeString: 'Triggered by GitHub webhook',
      token: 'main-trigger-token',
      printContributedVariables: true,
      printPostContent: false,
      regexpFilterText: '$PUSH_REF$PR_TARGET',
      regexpFilterExpression: '^(refs/heads/main|main|refs/heads/feature/.*|feature/.*)$'
    )
  }

  stages {
    stage('Print PR info') {
      when {
        expression { return env.x_github_event == 'pull_request' }
      }
      steps {
        echo "Pull Request: #${env.PR_NUMBER}"
        echo "Title: ${env.PR_TITLE}"
        echo "Author: ${env.PR_AUTHOR}"
        echo "Target branch: ${env.PR_TARGET}"
        echo "PR URL: ${env.PR_URL}"
      }
    }

    stage('Print commit info (main)') {
      when {
        expression { return env.x_github_event == 'push' && (env.PUSH_REF == 'refs/heads/main' || env.PUSH_REF == 'main') }
      }
      steps {
        echo "Commit: ${env.PUSH_COMMIT_ID}"
        echo "Message: ${env.PUSH_COMMIT_MSG}"
        echo "Ref: ${env.PUSH_REF}"
      }
    }

    stage('Print commit info (feature branch)') {
      when {
        expression { return env.x_github_event == 'push' && env.PUSH_REF?.startsWith('refs/heads/feature/') }
      }
      steps {
        echo "Commit: ${env.PUSH_COMMIT_ID}"
        echo "Message: ${env.PUSH_COMMIT_MSG}"
        echo "Ref: ${env.PUSH_REF}"
      }
    }
  }
}
