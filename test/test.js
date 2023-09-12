const b = require("block-page");
const u = require("./utils");

encodeAllTestFiles = async () => {
  testFiles = ["file1"];
  for (let index = 0; index < testFiles.length; index++) {
    const element = testFiles[index];
    file = await u.readTextFile("./files/" + element+".txt");
    console.log(file);
    obj = b.encode(file);
    await u.saveJSON(obj, "./output/" + element+".json");
  }
};

encodeAllTestFiles();
