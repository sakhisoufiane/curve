### Code build & deployment automation configuration  steps ###

1. Amazon EC2 - Security Group

2. Amazon EC2 - Load Balancer
    - DockerStagingApi (Forward to DockerStagingApi Target Group)
    - DockerStagingApp (Forward to DockerStagingApp Target Group)

3. Amazon EC2 - Target Groups
    - DockerStagingApi
    - DockerStagingApp

4. Amazon ECR (Elastic Container Registry)
    - Repositories
        
5. Amazon ECS (Elastic Container Service)
    - 5(A). Task Definitions
        - Select Type (EC2)
        - Task Definition Name
        - Task memory (MiB)
        - Task CPU (unit)
        - Add Container
            - Container Name
            - Image URL:Tag
            - Port mappings
    - 5(B). Cluster
        - Cluster Name
        - EC2 Instance Type
        - Number of Instances
        - Key Pair (To use for ssh)
        - Networking 
            - VPC
            - Subnets
            - Security Group   
    - 5(C). Cluster - Services
        - Launch Type (EC2)
        - Task Definition
        - Cluster
        - Service Name
        - Number of Task (1)
        - Configure Network
            - Load Balancer Type (Application)
            - Container to load balance
            - Add Container to load balance (Container linked through selected task definition)
        - Set Auto Scaling (optional)
            - Configure Service Auto Scaling to adjust your service’s desired count 

6. Amazon CodePipeline
    - Pipeline name
    - Service role
    - Add source stage
        - Source (Github)
        - Follow steps to connect to github, and select repository and branch
    - Add build stage
        - Build Provider (AWS CodeBuild)
        - Create Build Project (For testing)
            - Project name
            - Environment image (Managed Image)
            - Operating system (Amazon Linux 2)
            - Runtimes(s) (Standard)
            - Image (amazonlinux2-x86_64-standard:2.0)
            - Privileged (checked)
            - Service Rule (New)
                - Remember this rule name lated we need to attach polices to this rule
                    - To access ECR (Policy: AmazonEC2ContainerRegistryPowerUser)
                    - To Access S3 (Policy: AmazonS3FullAccess)
            - In Logs Select S3, Provide bucket name
            - Create yml file default testspecs.yml, include in repository
                - Build will execute instructions provided in yml file
        - Create Build Project (to build ECR Image)
            - Project name
            - Environment image (Managed Image)
            - Operating system (Amazon Linux 2)
            - Runtimes(s) (Standard)
            - Image (amazonlinux2-x86_64-standard:2.0)
            - Privileged (checked)
            - Service Rule (New)
                - Remember this rule name lated we need to attach polices to this rule
                    - To access ECR (Policy: AmazonEC2ContainerRegistryPowerUser)
                    - To Access S3 (Policy: AmazonS3FullAccess)
            - In Logs Select S3, Provide bucket name
            - Create yml file default buildspecs.yml, include in repository
                - Build will execute instructions provided in yml file 
        - Create Deployment
            - Action name
            - Action provider (Amazon ECS)
            - Select Cluster
            - Select Service
            
