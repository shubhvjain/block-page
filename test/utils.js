const fs = require('fs').promises;

let saveJSON = async (data, filePath) => {
  // Convert JSON data to a string
  const jsonString = JSON.stringify(data, null, 2);
  // Write the JSON data to the file
  try {
    await fs.writeFile(filePath, jsonString, 'utf8');
    console.log('File has been saved successfully.');
  } catch (err) {
    console.error('Error writing file:', err);
  }
};

let readTextFile =  async (filePath) => {
  // Read the file asynchronously
  try {
    const data = await fs.readFile(filePath, 'utf8');
    console.log('File contents:');
    console.log(data);
    return data
  } catch (err) {
    console.error('Error reading file:', err);
  }
};

module.exports = {saveJSON,readTextFile}

// saveJSON(jsonData, "sample1.json");
// console.log(readTextFile("sample.txt"))