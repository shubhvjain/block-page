// code to decode a document object to a text file
const act = require("./actions")

const decode = (doc,options={})=>{
  // TODO check if the doc is valid
  text = ""
  doc.blocks.map(blockId=>{
    let blockData = doc.data[blockId]
    dId = blockData.source.idExists? `.[${blockId}]` : ""
    dTitle = blockData.source.titleExists? `${blockData.title}` : ""
    let block  = `${dId}${dTitle}\n${blockData.source.first}\n\n`
    text += block
  })
  return text.replace(/\s*$/, '')
}
module.exports = decode