// code to encode a text file to document object

const act = require('./actions.js')

const encode = (document, options = {}) => {
  // step 1 : convert doc to blocks 
  let blocks = document.split("\n\n");

  // step 2: initialize blank doc object 
  let docObject =  act.getBlankDocObject() 

  // step 3 : first pass through all the docs 
  try {
    blocks.map((block, blockIndex) => {
      if (block.trim() == "") {
        docObject = act.doAddWarning(docObject,{
          text: `Blank block at position ${blockIndex + 1}`,
          blockIndex: blockIndex,
        })
      }
      docObject = act.doAddNewBlock(docObject,block)
    })
  } catch (error) {
    console.error(error)
    docObject = act.doAddError(docObject,{
      text: `${error.message}`,
      details: "Error occurred during processing blocks ",
    })
    return docObject;
  }
  return docObject;
};

module.exports = encode;
