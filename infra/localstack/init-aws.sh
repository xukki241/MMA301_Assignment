#!/bin/bash
echo "=== Initializing LocalStack Services ==="

# 1. Create S3 Bucket
echo "Creating S3 bucket: lms-uploads"
awslocal s3 mb s3://lms-uploads

# 2. Create Cognito User Pool (Skipped - Using mock-cognito)
# echo "Creating Cognito User Pool: lms-user-pool"
# USER_POOL_ID=$(awslocal cognito-idp create-user-pool \
#     --pool-name lms-user-pool \
#     --query 'UserPool.Id' \
#     --output text)
#
# echo "Created User Pool with ID: $USER_POOL_ID"

# 3. Create Cognito User Pool Client (Skipped - Using mock-cognito)
# echo "Creating Cognito User Pool Client: lms-user-client"
# CLIENT_ID=$(awslocal cognito-idp create-user-pool-client \
#     --user-pool-id "$USER_POOL_ID" \
#     --client-name lms-user-client \
#     --explicit-auth-flows "ALLOW_USER_PASSWORD_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_ADMIN_USER_PASSWORD_AUTH" \
#     --query 'UserPoolClient.ClientId' \
#     --output text)
#
# echo "Created User Pool Client with ID: $CLIENT_ID"

echo "=== LocalStack Initialization Completed ==="
