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
    SNYK_TOKEN = credentials('SNYK_TOKEN')
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

    stage('Security Scan with npm audit & Snyk') {
      steps {
        sh '''
          echo "Running npm audit..."
          npm audit --audit-level=high || true

          echo "Running Snyk scan..."
          npm install -g snyk
          snyk auth $SNYK_TOKEN
          snyk test || echo "Snyk scan found issues. See output above."
        '''
      }
    }

  stage('Push Docker Image to Amazon ECR') {
  steps {
    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWSCredsJenkinsDevUser']]) {
      sh '''
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        ECR_REPO_NAME=nutriplan-app
        ECR_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$ECR_REPO_NAME

        # Authenticate Docker with ECR
        aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_IMAGE

        # Create repo if it doesn't exist
        aws ecr describe-repositories --repository-names $ECR_REPO_NAME || \
        aws ecr create-repository --repository-name $ECR_REPO_NAME

        # Tag and push
        docker tag $DOCKER_IMAGE:$VERSION $ECR_IMAGE:$VERSION
        docker tag $DOCKER_IMAGE:$VERSION $ECR_IMAGE:latest

        docker push $ECR_IMAGE:$VERSION
        docker push $ECR_IMAGE:latest
      '''
    }
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

    stage('CloudWatch Metrics Check & Alert Simulation') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWSCredsJenkinsDevUser']]) {
          sh '''
            echo "Checking CloudWatch metrics for environment health..."

            if date --version >/dev/null 2>&1; then
              START_TIME=$(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%SZ)
            else
              START_TIME=$(date -u -v -10M +%Y-%m-%dT%H:%M:%SZ)
            fi

            END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

            aws cloudwatch get-metric-statistics \
              --namespace AWS/ElasticBeanstalk \
              --metric-name HealthStatus \
              --dimensions Name=EnvironmentName,Value=${EB_ENV_NAME} \
              --start-time $START_TIME \
              --end-time $END_TIME \
              --period 300 \
              --statistics Average \
              --region ${AWS_DEFAULT_REGION}
          '''
        }
      }
    }

    stage('Release Tagging') {
      steps {
        sh '''
          git config --global user.email "jenkins@ci.com"
          git config --global user.name "Jenkins CI"
          git tag -a $VERSION -m "Release version $VERSION"
          git push origin $VERSION || echo "Git push skipped or failed."
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
      echo "✅ Build and Deployment Successful!"
    }
    failure {
      echo "❌ Build or Deployment Failed!"
    }
    always {
      echo '🧹 Cleaning up workspace...'
      cleanWs()
    }
  }
}
