output "site_url" {
  description = "Public URL of the deployed game."
  value       = "https://${cloudflare_pages_project.site.subdomain}"
}

output "project_name" {
  description = "Pages project name, needed by ./deploy.sh."
  value       = cloudflare_pages_project.site.name
}
