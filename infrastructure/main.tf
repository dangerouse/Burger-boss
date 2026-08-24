provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# A direct-upload Pages project: Terraform creates and owns the project, and
# the file contents are pushed separately by ./deploy.sh. There is no source
# block, which is what puts the project in direct-upload rather than git mode.
#
# Direct upload is deliberate here. It is the only deployment path that needs
# no write access to the GitHub repository.
resource "cloudflare_pages_project" "site" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = "main"
}
