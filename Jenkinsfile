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
    ECS_CLUSTER = "nutriplan-cluster"
    ECS_SERVICE = "nutriplan-service"
    ECS_TASK_FAMILY = "nutriplan-task"
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

    stage('Push to ECR') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWSCredsJenkinsDevUser']]) {
          script {
            def ecrRepo = "245499663438.dkr.ecr.us-east-1.amazonaws.com/nutriplan-app"
            sh """
              echo "Authenticating to AWS ECR..."
              aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ecrRepo

              echo "Tagging Docker image with version and latest..."
              docker tag $DOCKER_IMAGE:$VERSION $ecrRepo:$VERSION
              docker tag $DOCKER_IMAGE:$VERSION $ecrRepo:latest

              echo "Pushing image to ECR..."
              docker push $ecrRepo:$VERSION
              docker push $ecrRepo:latest
            """
          }
        }
      }
    }

    stage('Deploy to ECS') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWSCredsJenkinsDevUser']]) {
          script {
            def template = readFile('ecs-task-def-template.json')
            def versioned = template.replace('${VERSION}', "${VERSION}")
            writeFile file: 'ecs-task-def.json', text: versioned

            sh """
              echo "Registering ECS Task Definition..."
              aws ecs register-task-definition --cli-input-json file://ecs-task-def.json

              echo "Deploying new version to ECS..."
              aws ecs update-service \
                --cluster $ECS_CLUSTER \
                --service $ECS_SERVICE \
                --force-new-deployment

              echo "Waiting for service stability..."
              aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE

              echo "Deployment complete and service stable."
            """
          }
        }
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

    stage('Rollback') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-jenkins-creds']]) {
          script {
            def currentRevision = sh(
              script: "aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --query 'services[0].taskDefinition' --output text | awk -F ':' '{print \$2}'",
              returnStdout: true
            ).trim()

            def previousRevision = (currentRevision.toInteger() - 1).toString()

            echo "Current revision: ${currentRevision}"
            echo "Previous revision: ${previousRevision}"

            input message: "Trigger rollback to revision ${previousRevision}?"

            sh """
              echo "Rolling back to previous task definition revision..."
              aws ecs update-service \
                --cluster $ECS_CLUSTER \
                --service $ECS_SERVICE \
                --task-definition ${ECS_TASK_FAMILY}:${previousRevision} \
                --force-new-deployment

              echo "Waiting for service stability after rollback..."
              aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE

              echo "Rollback complete and service stable."
            """
          }
        }
      }
    }
  }

  post {
    always {
      echo 'Cleaning up workspace...'
      cleanWs()
    }
  }
}