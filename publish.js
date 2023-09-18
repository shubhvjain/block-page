// run this to publish the latest version of the package on npm
// to run this provide version_type argument which can be "minor" or "patch"

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const updatePackageJSON = async (versionType) => {
  // Check if the version type is valid (patch or minor)
  if (!["patch", "minor"].includes(versionType)) {
    console.error('Invalid version type. Please use "patch" or "minor".');
    process.exit(1);
  }
  // Read the package.json file
  const packageJsonPath = path.join(__dirname, "package.json");
  const packageJson = require(packageJsonPath);

  // Split the current version into an array of major, minor, and patch parts
  const currentVersionParts = packageJson.version.split(".");

  // Update the version based on the version type
  if (versionType === "patch") {
    currentVersionParts[2] = (parseInt(currentVersionParts[2]) + 1).toString();
  } else if (versionType === "minor") {
    currentVersionParts[1] = (parseInt(currentVersionParts[1]) + 1).toString();
    currentVersionParts[2] = "0";
  }

  // Construct the updated version string
  const updatedVersion = currentVersionParts.join(".");

  // Update the package.json with the new version
  packageJson.version = updatedVersion;

  // Write the updated package.json back to the file
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  console.log(`package.json version updated  to ${updatedVersion}`);
  return updatedVersion;
};

const main = async () => {
  // Optionally, you can commit the changes to git
  try {
    //execSync(`git add . && git commit -m "version to ${updatedVersion}"`);
    //console.log('Committed changes to git.');
    const versionType = process.argv[2];
    let ver = await updatePackageJSON(versionType);
    execSync(`npm run build-frontend`);

  } catch (error) {
    //console.error('Failed to commit changes to git:', error.message);
  }
};

main();
