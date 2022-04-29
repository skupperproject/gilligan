# Use the following steps to generate a gilligan release

* Create a branch (off of the master branch commit) you want to release
  * Name the branch with the patch part set to 'x'. For example 1.0.x
* Test the branch to make sure there are no obvious bugs. If bugs are found, create relevant github issues, fix the bugs,
  push the fixes to the master branch and cherry-pick those same fixes to the newly created branch.
* When you are ready to create a release, create a tag on the commit in the branch that you want to create the release
  on and push the tag to the gilligan git repo. The tag name should contain the release number you are trying
  to release E.g. 1.0.0
  * Note that there is no need to change any versions on the branch.
* The [Release gilligan](https://github.com/skupperproject/gilligan/blob/master/.github/workflows/release.yml)
  workflow will be automatically triggered once a tag matching the pattern x.y.z* (E.g. 1.0.0 or 1.0.0-rc1) is pushed to the git repo.
  This release workflow will:
  * Install dependencies, build, test and package gilligan, generating a file named console.tgz
  * Creates a *draft release* which can be seen here - <https://github.com/skupperproject/gilligan/releases/>
* Edit the draft release by clicking the pencil link and verify if the details in the draft release are accurate.
  * Add more details to the text box if necessary. The text box should already contain a link to the issues that
    were fixed in this milestone.
* When everything has been verified click the *Publish release* button to publish the release.
* Create the next milestone if necessary.
* There is no need to advance any versions on the master branch.
