pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out Smart Parking project...'
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                echo 'Building React frontend...'
                dir('frontend') {
                    bat 'npm install'
                    bat 'npm run build'
                }
            }
        }

        stage('Build Backend') {
            steps {
                echo 'Building Spring Boot backend...'
                dir('backend') {
                    bat 'mvn clean package -DskipTests'
                }
            }
        }

        stage('Deploy Frontend') {
            steps {
                echo 'Deploying frontend to GitHub Pages...'

                withCredentials([
                    usernamePassword(
                        credentialsId: 'github-pat',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    )
                ]) {
                    dir('frontend') {
                        bat '''
                            git config user.name "Jenkins"
                            git config user.email "jenkins@localhost"

                            git remote set-url origin https://%GIT_USER%:%GIT_TOKEN%@github.com/Ravi16329/parking-system.git

                            set CACHE_DIR=C:\gh-cache
                            npx gh-pages -d build
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'CI/CD Pipeline completed successfully!'
        }

        failure {
            echo 'CI/CD Pipeline failed!'
        }
    }
}