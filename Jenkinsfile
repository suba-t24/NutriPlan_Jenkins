pipeline {
  agent any

  environment {
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

    stage('Test') {
      steps {
        sh 'npm run test'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t nutriplan-app .'
      }
    }

    stage('Deploy with Docker Compose') {
      steps {
        sh 'docker-compose up -d'
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
        sh 'npm audit --audit-level=high'
      }
    }
  }
}