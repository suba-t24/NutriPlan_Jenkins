pipeline {
  agent any

  environment {
    PATH = "/opt/homebrew/bin:/usr/local/bin:${env.PATH}"
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SONAR_ORG = 'suba-t24'
    SONAR_PROJECT_KEY = 'suba-t24_NutriPlan_Jenkins'
    DOCKER_IMAGE = "nutriplan-app"
    VERSION = "v1.${BUILD_NUMBER}"
    AWS_DEFAULT_REGION = 'us-east-1'
    EB_APP_NAME = 'nutriplan-eb-app'
    EB_ENV_NAME = 'nutriplan-env'
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
        sh 'FORCE_COLOR=0 npx cypress run --reporter spec --reporter-options colors=false'
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

    stage('SonarCloud Code Analysis') {
      steps {
        sh '''
          npm install -g sonar-scanner
          sonar-scanner \
            -Dsonar.projectKey=$SONAR_PROJECT_KEY \
            -Dsonar.organization=$SONAR_ORG \
            -Dsonar.host.url=https://sonarcloud.io \
            -Dsonar.login=$SONAR_TOKEN \
            -Dsonar.exclusions=**/node_modules/**,**/tests/**
        '''
      }
    }

    stage('Security Scan') {
      steps {
        sh 'npm audit --audit-level=high || true'
      }
    }

    stage('Deploy to Elastic Beanstalk') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWSCredsJenkinsDevUser']]) {
          sh '''
            export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
            export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
            export AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION

            eb init $EB_APP_NAME --platform docker --region $AWS_DEFAULT_REGION
            eb use $EB_ENV_NAME
            eb deploy --staged
          '''
        }
      }
    }

    stage('CloudWatch Metrics Check') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWSCredsJenkinsDevUser']]) {
          sh '''
            echo "Checking CloudWatch metrics for environment health..."
            aws cloudwatch get-metric-statistics \
              --namespace AWS/ElasticBeanstalk \
              --metric-name HealthStatus \
              --dimensions Name=EnvironmentName,Value=${EB_ENV_NAME} \
              --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
              --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
              --period 300 \
              --statistics Average \
              --region ${AWS_DEFAULT_REGION}
          '''
        }
      }
    }

    stage('Release') {
      steps {
        sh '''
          docker tag $DOCKER_IMAGE:$VERSION $DOCKER_IMAGE:release
          echo "Release image tagged."
        '''
      }
    }

    stage('Monitoring Health Endpoint') {
      steps {
        echo 'Checking app health endpoint...'
        sh '''
          sleep 10
          curl --fail http://localhost:3000/health || echo "Health check failed or endpoint not available."
        '''
      }
    }
  }

  post {
    success {
      echo "Build succeeded!"
    }
    failure {
      echo "Build failed!"
    }
    always {
      echo 'Cleaning up workspace...'
      cleanWs()
    }
  }
}
