pipeline {
    agent any

    environment {
        SONAR_TOKEN = credentials('SONAR_TOKEN') // Jenkins credential ID
        DOCKER_IMAGE = 'nutriplan-app:latest'
        SONAR_PROJECT_KEY = 'suba-t24_NutriPlan_Jenkins'
        SONAR_ORG = 'suba-t24'
        SONAR_HOST_URL = 'https://sonarcloud.io'
    }

    stages {
        stage('Lint') {
            steps {
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
                script {
                    docker.build(DOCKER_IMAGE)
                }
            }
        }

        stage('SonarCloud Scan') {
            steps {
                withSonarQubeEnv('SonarCloud') { // Ensure 'SonarCloud' is configured in Jenkins under SonarQube servers
                    sh """
                        sonar-scanner \
                        -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                        -Dsonar.organization=${SONAR_ORG} \
                        -Dsonar.host.url=${SONAR_HOST_URL} \
                        -Dsonar.login=${SONAR_TOKEN}
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker-compose up -d'
            }
        }
    }

    post {
        always {
            echo 'Cleaning up...'
            sh 'docker-compose down'
        }
    }
}