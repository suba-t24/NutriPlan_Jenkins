pipeline {
  agent any

  environment {
    PATH = "/opt/homebrew/bin:/usr/local/bin:${env.PATH}"
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SONAR_ORG = 'suba-t24'
    SONAR_PROJECT_KEY = 'suba-t24_NutriPlan_Jenkins'
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
        // Start your node app in background
        sh 'npm start &'
        // Wait for app to be ready (adjust timing if needed)
        sh 'sleep 10'
      }
    }

    stage('Test') {
      steps {
        sh 'npm run test'
      }
    }

    stage('Stop App') {
      steps {
        // Kill node processes started by npm start to free port 3000
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