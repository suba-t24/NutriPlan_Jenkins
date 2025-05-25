pipeline {
  agent any

  environment {
    PATH = "/opt/homebrew/bin:/usr/local/bin:${env.PATH}"
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SONAR_ORG = 'suba-t24'
    SONAR_PROJECT_KEY = 'suba-t24_NutriPlan_Jenkins'
    DOCKER_IMAGE = "nutriplan-app"
    VERSION = "v1.${BUILD_NUMBER}"
  }

  stages {

    stage('Install Dependencies') {
      steps {
        sh 'npm install'
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }
    stage('Unit Tests') {
      steps {
        sh 'npm run test'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh '''
          docker build -t $DOCKER_IMAGE:$VERSION .
          docker tag $DOCKER_IMAGE:$VERSION $DOCKER_IMAGE:latest
        '''
      }
    }

    stage('Deploy with Docker Compose') {
      steps {
        sh 'docker-compose --env-file .env down || true'
        sh 'docker-compose --env-file .env up -d --build'
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
            -Dsonar.login=$SONAR_TOKEN \
            -Dsonar.exclusions=**/node_modules/**,**/tests/** \
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
        echo "Tagging release version..."
        sh '''
          docker tag $DOCKER_IMAGE:$VERSION $DOCKER_IMAGE:release
          echo "Simulated release complete."
        '''
      }
    }

    stage('Monitoring') {
      steps {
        echo 'Performing simulated health check...'
        sh '''
          sleep 10
          curl --fail http://localhost:3000/health || echo "Health check failed or endpoint not found"
        '''
        echo 'Simulated alerting/logs/metrics check'
      }
    }

    stage('Simulated Rollback Plan') {
      steps {
        echo 'To rollback:'
        echo '1. docker tag nutriplan-app:previous-stable nutriplan-app:latest'
        echo '2. docker-compose --env-file .env down && docker-compose --env-file .env up -d'
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