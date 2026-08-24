# Infrastructure

Terraform that publishes Burger Boss as a public Cloudflare Pages site at
`https://burger-boss.pages.dev`.

Terraform owns the *project*; [`deploy.sh`](deploy.sh) owns the *file
contents*. The `cloudflare_pages_project` resource has no `source` block, which
puts it in direct-upload mode, and the script pushes the game up with
`wrangler pages deploy`.

## Why direct upload

Direct upload is the only path that needs no write access to the GitHub
repository. The two alternatives both require permissions this checkout does
not have:

- **Cloudflare's git integration** needs its GitHub app authorised on
  `harper-prog/Burger-boss`, which is a repository admin action.
- **A GitHub Actions workflow** needs the workflow file committed and pushed to
  that repository, plus two repository secrets, which is also admin.

So deploys are a command you run rather than something that fires on push. See
"Automating this later" below.

## One-time setup

Create an API token in the Cloudflare dashboard under **My Profile -> API
Tokens -> Create Token**, with the **Cloudflare Pages: Edit** permission. Then:

```bash
export CLOUDFLARE_API_TOKEN=...
cd infrastructure
terraform init
terraform apply -var="cloudflare_account_id=<your account id>"
```

`apply` prints the site URL. The project starts empty, so deploy the game into
it:

```bash
./deploy.sh
```

Put the account id in a `terraform.tfvars` if you would rather not pass it
every time. That file is gitignored.

## Deploying

```bash
./deploy.sh                 # deploys to the default project, burger-boss
./deploy.sh some-other-name # deploys to a different project
```

The script stages the six game files into a temporary directory and uploads
that, so nothing else in the repository reaches the public site.

## Automating this later

If you get push access to the repository, deploys can move into CI. Add a
workflow that runs `cloudflare/wrangler-action` with `command: pages deploy
dist --project-name burger-boss`, and set `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` as repository secrets. Nothing in this module needs to
change for that.

A GitHub Pages variant of this module exists in git history at commit
`ecdf89f`, if that route ever becomes available.

## Files

| File | Contents |
| --- | --- |
| `versions.tf` | Terraform and provider version constraints |
| `main.tf` | The provider and the `cloudflare_pages_project` resource |
| `variables.tf` | API token, account id, project name |
| `outputs.tf` | The public site URL and the project name |
| `deploy.sh` | Stages the game and uploads it with wrangler |

## State

State is local — `terraform.tfstate` sits in this directory and is gitignored.
For a single resource that is the right trade. To move it remote, add a
`backend` block to `versions.tf` and run `terraform init -migrate-state`.
