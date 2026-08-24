variable "cloudflare_api_token" {
  description = <<-DESC
    API token with the "Cloudflare Pages: Edit" permission. Leave unset to let
    the provider read CLOUDFLARE_API_TOKEN from the environment, which is the
    recommended path. Create one at:

      Cloudflare dashboard -> My Profile -> API Tokens -> Create Token
  DESC
  type        = string
  default     = null
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account that owns the Pages project."
  type        = string
}

variable "project_name" {
  description = "Pages project name. Also decides the URL: <name>.pages.dev."
  type        = string
  default     = "burger-boss"
}
