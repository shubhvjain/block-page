// actions on the doc object when working with a GUI editor to manipulate the document object 

/**
 * generate a blank doc obj [o]
 * add a new node [o]
 * add edge between 2 nodes [o]
 * edit node content []
 * edit edge []
 * delete an edge []
 * delete a node []
 */

const act = require("./actions")

const addNode = (doc,id,title,body="") =>{
  block = `.[${id}] ${title} \n ${body} \n`
  doc = act.doAddNewBlock(doc,block)
  return doc
}

const genBlankDocObj = ()=>{
  // the block doc will contain one node titled Central idea (block id: main)
  doc = act.getBlankDocObject()
  doc = addNode(doc,"main","Central Idea","")
  return doc
}

const addEdge = (doc,fromId,toId,label="part") => {
  appendBlock = `+[${fromId}] \n ~[${label},${toId}] \n`
  doc = act.doAddNewBlock(doc,block)
  return doc
}

const editNode = (doc,blockId,changes)=>{
  // changes can include title, text
}

const editEdge = (doc,)=>{}

