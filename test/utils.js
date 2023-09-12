const fs = require('fs').promises;

let saveFile = async (data, filePath, json=false) => {
  // Convert JSON data to a string
  let string = json ? JSON.stringify(data, null, 2) : data
  try {
    await fs.writeFile(filePath, string, 'utf8');
    console.log('File has been saved successfully.');
  } catch (err) {
    console.error('Error writing file:', err);
  }
};

let readFile =  async (filePath,json = false) => {
  // Read the file asynchronously
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return  json ? JSON.parse(data) : data
  } catch (err) {
    console.error('Error reading file:', err);
  }
};

module.exports = {saveFile,readFile}

// saveJSON(jsonData, "sample1.json");
// console.log(readTextFile("sample.txt"))