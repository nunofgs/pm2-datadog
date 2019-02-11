workflow "Publish to NPM" {
  on = "release"
  resolves = ["publish"]
}

action "publish" {
  uses = "actions/npm@4633da3702a5366129dca9d8cc3191476fc3433c"
  args = "publish"
  secrets = ["NPM_AUTH_TOKEN"]
}
