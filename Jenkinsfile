pipeline {
  agent any

  environment {
    PATH = "/opt/homebrew/bin:/usr/local/bin:${env.PATH}"
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SONAR_ORG = 'suba-t24'
    SONAR_PROJECT_KEY = 'suba-t24_NutriPlan_Jenkins'
    TERM = 'xterm'
    CI = 'true'
  }

  stages {
    stage('Lint') {
      steps {
        sh 'npm install'
        sh 'npm run lint'
      }
    }
    stage('Start App') {
      steps {
        sh 'npm start &'
        script {
          def maxRetries = 30
          def waitTime = 2
          def ready = false
          for (int i = 0; i < maxRetries; i++) {
            try {
              sh 'curl --fail http://localhost:3000/health'
              ready = true
              echo "App is ready!"
              break
            } catch (err) {
              echo "Waiting for app to be ready... Attempt ${i + 1}/${maxRetries}"
              sleep waitTime
            }
          }
          if (!ready) {
            error "App did not start in time"
          }
        }
      }
    }

    stage('Test') {
      steps {
        sh 'npx cypress run --headless'
      }
    }

    stage('Stop App') {
      steps {
        sh "pkill -f 'node'"
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t nutriplan-app .'
      }
    }

    stage('Deploy with Docker Compose') {
      steps {
        sh 'docker-compose down || true'
        sh 'docker-compose up -d --build'
      }
    }

    stage('SonarCloud Code Analysis') {
      steps {
        sh '''
          npm install -g sonar-scanner
          sonar-scanner \
            -Dsonar.projectKey=$SONAR_PROJECT_KEY \
            -Dsonar.organization=$SONAR_ORG \
            -Dsonar.host.url=https://sonarcloud.io \
            -Dsonar.login=$SONAR_TOKEN
        '''
      }
    }

    stage('Security Scan') {
      steps {
        sh 'npm audit --audit-level=high || true'
      }
    }

    stage('Release') {
      steps {
        echo 'Simulating release to production...'
        sh 'docker tag nutriplan-app nutriplan-app:release'
      }
    }

    stage('Monitoring') {
      steps {
        echo 'Performing simulated health check...'
        sh 'sleep 10'
        sh 'curl --fail http://localhost:3000/health || echo "Health check failed or endpoint not found"'
      }
    }
  }

  post {
    always {
      echo 'Pipeline completed.'
    }
    success {
      echo 'All steps succeeded!'
    }
    failure {
      echo 'Some steps failed. Check logs.'
    }
  }
}
