(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.blockPage = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const encode = require("./src/encode")
const decode = require("./src/decode")
const action = require("./src/actions")

module.exports = {
  encode : encode,
  decode : decode,
  action : action
}
},{"./src/actions":2,"./src/decode":3,"./src/encode":4}],2:[function(require,module,exports){
// code to perform actions on a document object and  maintain its validity

/**
 * valid actions 
 * get blank document [done]
 * add a new block in a document [done]
 * relate one block with another 
 * edit block : modify text, modify edges [done]
 * delete block [done]
 * validate documentObject
 * search query :graph 
 * text search
 */

const graph = require("./graph.js");

const getBlankDocObject = () => {
  let docObject = {
    valid: true,
    blocks: [],
    data: {},
    graphs: {},
    errors: [],
    warnings: [],
    metadata: {},
    extra: {},
  };

  docObject.graphs.deps = graph.createGraph({
    isSimple: true,
    hasLoops: false,
    hasDirectedEdges: true,
    title: "Invocation block dependency graph",
  });
  docObject.graphs.knowledge = graph.createGraph({
    hasLoops: false,
    isSimple: true,
    hasDirectedEdges: true,
    title: "Knowledge graph",
  });
  return docObject
};

const removeSpace = (text) => {
  // converts all spaces in between words in a string with dash
  let noSpaceText = text.trim().replaceAll(/ +/g, "-");
  noSpaceText = noSpaceText.toLowerCase();
  return noSpaceText;
};

const randomInteger = (min = 0, max = 100) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

//// actions on the doc object 
// these methods will have a common naming convention : doAction(doc, ...additional params), modifies the doc, returns the doc

const doAddError = (doc,errorData={"message":"",block:""})=>{
  doc.valid = false;
  doc.errors.push(errorData)
  return doc
}

const doAddWarning = (doc,warningData={"message":"",block:""})=>{
  doc.warnings.push(warningData)
  return doc
}

const getBlankAnnotationObject = (type)=>{
  return {
    raw: "", // the raw unprocessed string 
    text: "", // text extracted after sanitizing brackets and annotations  
    blockId: "", // block id of the block in which this annotation exists TODO see if this even required as a common key
    // processed: false, // indicates whether the annotation is processed or not 
    type: type, // the type of annotation 
  }
}

/**
 *  how to define an annotation
 * each annotation has __ methods 
 * 
 * the extract method describes how to extract this annotation from a raw piece of text
 *  it must return {error:boolean, message:" if there is some error", annotation (array of the annotation objs , a modified version of the blank ann obj, array because there can be multiple same annotations in the text )}
 *  
*/

const annotations = {
  declaration: {
    usage: `To declare a new block, .
    Format of the block : 

    .[block name] Block title
    Block content
    <new line>
    `,
    extract: (text) => {
      const reg = /^\.\[([\+]?)([\w\s\-]+?)([,]*?)([\w\s\-]+?)\]/gm;
      const parts = text.match(reg);
      if (parts) {
        // there should be only a single deceleration annotation 
        // TODO add a check if multiple dec exists in a single block
        let ann = getBlankAnnotationObject("declaration")
        ann["raw"] = parts[0]
        const theString = parts[0].replace(".[", "").replace("]", "").trim();
        ann.text = theString;
        let part1 = theString.split(",");
        ann.blockId = removeSpace(part1[0]);

        return { error: false, message :"", annotations:  [ann]};
      } else {
        return { error: false, message :"No declaration annotations", annotations:  []};
      }
    },
  },
  append: {
    usage : `To append content to an already existing block
    Format :
    +[block name] Title doesn't matter
    More content that will be appended 
    <new line>`,

    extract: (text) => {
      const reg = /^\+\[([\+]?)([\w\s\-]+?)\]/gm;
      const parts = text.match(reg);
      if (parts) {
        let ann = getBlankAnnotationObject("append")
        ann["raw"] = parts[0]
        const theString = parts[0].replace("+[", "").replace("]", "").trim();
        ann.text = theString;
        ann.blockId = removeSpace(theString);
        return { error: false, message :"", annotations:[ann]};
      } else {
        return { error: false, message :"No append annotations", annotations:  []};
      }
    },
  },
  invocation: {
    usage : `To get include the content of one block to another block where this annotation is specified
    Format :
    ....block content....
    >[block id 1]
    ......block content....
    >[block id 2]
    `,
    extract: (text) => {
      const reg = /\>\[([\w\s\-]+?)([\.]*)([\w\s\-]*)([\.]*)([\w\s\-]*)\]/gm;
      const parts = text.match(reg);
      if (parts) {
        let anns = [];
        parts.map((part) => {
          let ann = getBlankAnnotationObject("invocation")
          ann.raw = part
          const theString = part.replace(">[", "").replace("]", "").trim();
          ann.text = theString;
          ann.blockId = theString
          // TODO added check : this can only be a valid block id 
          anns.push(ann);
        });
        return { error: false, message :"", annotations:anns};
      } else {
        return { error: false, message :"No invocation annotations", annotations:  []};
      }
    },
  },
  edge: {
    usage: `To relate one block to another in the document object's knowledge graph
    Format: 
    ...content of block-1....
    ~[label 1,block-2]
    ~[label 2,block-3]
    ... content of block-1....
    `,
    extract: (text) => {
      const reg = /\~\[([\w\s\-\,\.\*]+?)\]/gm;
      const parts = text.match(reg);
      if (parts) {
        let anns = [];
        parts.map((part) => {
          let ann = getBlankAnnotationObject("edge")
          ann.raw = part
          ann["v1"] = "*"
          ann["v2"] = "*"
          ann["label"] = ""
          const theString = part.replace("~[", "").replace("]", "").trim();
          ann.text = theString;
          let part1 = theString.split(",");
          if (part1.length == 2) {
            ann.v2 = removeSpace(part1[1]);
            ann.label = removeSpace(part1[0]);
          } else if (part1.length == 3) {
            ann.v1 = removeSpace(part1[0]);
            ann.v2 = removeSpace(part1[2]);
            ann.label = part1[1];
          } else {
            // TODO fix this (decide later) ... either do this be setting error : true or keep it as it is 
            throw new Error(
              `Invalid edge annotation : ${part}. Format :  or  or   (* for current block id)`
            );
          }
          anns.push(ann);
          
        })
        return { error: false, message :"", annotations:anns};
      } else {
        return { error: false, message :"No edge annotations", annotations:  []};
      }
    },
  },
  action: {
    usage:`
    To specify actions (kind of like a function call)
    Format : 
    ...block 1 content....
    /[todo:this and that]
    /[reply, to = some thing, subject = haha]
    ..block 1 content....
    `,
    extract: (text) => {
      const reg = /\/\[([\s\w\:\,\=\%\.\_\-\/\>\<]+?)\]/gm;
      const parts = text.match(reg);
      const parseActionArguments = (argumentText) => {
        let result = { action: "", arguments: { text: "", d: "0" } };
        const parts = argumentText.split(":");
        result.action = parts[0].trim();
        if (parts.length > 1) {
          let argParts = parts[1].split(",");
          if (argParts.length > 0) {
            result.arguments["text"] = argParts[0].trim();
            argParts.shift();
            argParts.map((argu) => {
              let ar = argu.split("=");
              result.arguments[ar[0].trim()] = ar[1].trim();
            });
          }
        }
        return result;
      };
      if (parts) {
        let anns = [];
        parts.map((part) => {
          let ann = getBlankAnnotationObject("action")
          ann["action"]=""
          ann["arguments"]= {}
          ann.raw = part
          const theString = part.replace("/[", "").replace("]", "").trim();
          ann.text = theString;
          let part1 = parseActionArguments(theString);
          ann = { ...ann, ...part1 };
          anns.push(ann);
        });
        return { error: false, message :"", annotations:anns};
      } else {
        return { error: false, message :"No edge annotations", annotations:  []};
      }
    },
  }
}

const extractAllAnnotations = (rawBlock) => {
  let annotationList = []; // store all the annotations found in the raw text
  let annCount = {}; // to store a count of each of annotation type found in the raw text. this make processing of annotations easier
  const allAnnotations = Object.keys(annotations);
  allAnnotations.map((ann) => {
    let anns = annotations[ann].extract(rawBlock);
    // TODO modify to check the error key in the object returns
    // console.log(anns)
    annCount[ann] = anns["annotations"].length;
    annotationList = [...annotationList, ...anns["annotations"]];
  })
  return { stats: annCount, annotations: annotationList };
}

const getBlankBlockObject = () => {
  let newBlockData = {
    blockId: "",
    title:"",
    text: "", // this is the text after annotations are processed. this  will not include the 
    source: { raw: [], first: "", titleExists:false, idExists:false},
    dataType: "default",
    value: {},
    annotations: [],
    process: [],
  }; 
  // some annotations, after processing will be removed from the text of the block. this is stored in the `text` key of the object 
  return newBlockData
}

const doAddNewBlock = (docObject,blockText)=>{
  // step 1 :  extract all annotations from the block 
  blockText = blockText.replace(/^\n/, '')
  let ann = extractAllAnnotations(blockText)

  // step 2 : generate a new block object 
  newBlockData = getBlankBlockObject()

  // step 3 : process all annotations one by one starting with declaration
  let blockData; // this is the actual block data obj

  // check if both declaration and  append annotations exists
  if(ann.stats.declaration > 0 && ann.stats.append > 0 ){
    docObject = act.doAddError(docObject,{
      text: `Annotation error`,
      details: " A single block cannot have both declaration and append annotation ",
      blockText
    })
    return docObject;
  }

  // processing declaration :
  // 4 possible cases : (1)no dec, but append :not processed here (2) no dec , no append :create a block with random id (3) both dec  and append : already taken care of above
  if (ann.stats.declaration == 1) {
    let dec = ann.annotations.find((itm) => {return itm.type == "declaration";});
    if (docObject.data[dec.blockId]) {
      throw new Error(`Re-declaration of ${dec.blockId} is invalid. Use append instead`);
    }
    // get the title
    let lines = blockText.split('\n');
    let blockTitle = lines.shift().replace(dec.raw, "");
    let noBlockTitle = false
    if (blockTitle.trim().length==0){
      blockTitle = `Block ${dec.blockId}`
      noBlockTitle = true
    }
    const newTextWithoutTitle = lines.join('\n');
    let newText =  newTextWithoutTitle
    blockData = {
      ...newBlockData,
      text: newText,
      blockId: dec.blockId,
      title: blockTitle,
      // data type should be processed at the end of processing all annotations
      source: { raw: [blockText], first: newText, titleExists:!noBlockTitle, idExists:true}, // this has the raw text, unprocessed further while processing annotations
      annotations: ann.annotations,
      process: ["declaration initialized"],
    };
    docObject.blocks.push(dec.blockId);
    docObject.data[dec.blockId] = blockData;
  } else if (ann.stats.append == 0) {
    // define a new block 
    let randomBlockName = randomInteger(1000, 9999);
    blockData = {
      ...newBlockData,
      blockId: randomBlockName,
      text: blockText,
      title:"Untitled",
      source: { raw: [blockText], first: blockText, titleExists:false, idExists:false},
      annotations: ann.annotations,
      process: ["declaration initialized with random block id"],
    };
    docObject.blocks.push(randomBlockName);
    docObject.data[randomBlockName] = blockData;
  }
  // add a new node for this new block in the dependency graph
  try {
    docObject.graphs.deps = graph.addVertex(docObject.graphs.deps, {id: blockData.blockId})
  } catch (error) {
    // console.error(error);
  }

  // append annotation
  if (ann.stats.append == 1) {
    let act = ann.annotations.find((itm) => {return itm.type == "append";});
    let blockFound = docObject.blocks.indexOf(act.blockId) > -1;
    if (blockFound) {
      // update the block object
      blockData = docObject.data[act.blockId];
      let newText = blockText.replace(act.raw, ""); // the first line in the append cannot have anything else including a title 
      blockData.text = blockData.text + "\n" + newText;
      blockData.source.first = blockData.source.first + "\n" + blockText;
      blockData.source.raw.push(blockText);
      blockData.annotations = [
        ...blockData.annotations,
        ...ann.annotations,
      ];
      blockData.process.push("Append annotation processed");
    } else {
      throw new Error(
        `the append annotation on block ${act.blockId} is not valid at this block does not exist.`
      );
    }
  }
  
  // invocation annotation : here we are just adding the blocks that need to be replaced in the dependency graph
  if (ann.stats.invocation > 0) {
    let allInv = ann.annotations.filter((itm) => {return itm.type == "invocation";});
    allInv.map((inv) => {
      if (inv.blockId == blockData.blockId) {throw new Error(`Invalid invocation : ${inv.raw}. You cannot invoke the same block.`);}
      try {
        docObject.graphs.deps = graph.addVertex(docObject.graphs.deps, {id: inv.blockId});
      } catch (error) {
        // nothing to worry about. if adding a vertex in a dep graph fails, it probably means it already exists in the dep graph when it was declared
        //console.error(error)
      }
      // adding an edge from the current block to the invocated block. this indicates that the current block is dependent on invocated block
      docObject.graphs.deps = graph.addEdge(docObject.graphs.deps, {v1: blockData.blockId,v2: inv.blockId,})
      docObject.data[blockData.blockId].process.push(`invocation ${inv.raw} initialized in dep graph`)
    });
  }
  
  // edge annotations 
  const allEdges = ann.annotations.filter((itm) => {return itm.type == "edge"})
  allEdges.map((ed) => {
    let v1 = ed.v1 != "*" ? ed.v1 : blockData.blockId;
    let v2 = ed.v2 != "*" ? ed.v2 : blockData.blockId;
    if (v1 == v2) {throw new Error(`Invalid edge annotation ${ed.raw}.Cannot relate a node to itself`)}
    
    try {
      // add the current node v1 in the knowledge graph 
      docObject.graphs.knowledge = graph.addVertex(docObject.graphs.knowledge,{ id: v1 })
    } catch (er) {
      //console.error(er)
    }
    try {
      docObject.graphs.knowledge = graph.addVertex( docObject.graphs.knowledge,{ id: v2 })
    } catch (er) {
      // console.error(er);
    }
    // now add an edge between v1 -->  v2
    docObject.graphs.knowledge = graph.addEdge(docObject.graphs.knowledge, { v1: v1, v2: v2, label: ed.label, temp:{addedByBlock:blockData.blockId}});
    // replace the invocation text in the main text
    let newText = docObject["data"][blockData.blockId].text.replace(ed.raw,"");
    docObject["data"][blockData.blockId].text = newText;
    docObject["data"][blockData.blockId].process.push(`edge-annotation: ${ed.text} processed`);
  })

  // check node dependencies 
  if(docObject.graphs.deps.edges.length>0){
    // there are some edges in the dependency graph, we check if they are consistent i.e all the vertices between the edges exists. if they do, the dep graph can be processed otherwise not
    missingBlocks = []
    docObject.graphs.deps.edges.map(edge=>{
      if(!docObject.data[edge.v1]){
        missingBlocks.push(edge.v1)
      }
      if(!docObject.data[edge.v2]){
        missingBlocks.push(edge.v2)
      }
    })
    if(missingBlocks.length>0){
      // cannot be processed
      docObject = doAddError(docObject,{
        text: `Invocation annotations can not be processed. Missing blocks : ${missingBlocks}`,
      })
      return docObject;
    }else{
      // all invocation block can be processed 
      // generate the order of processing of the blocks 
      try {
        let order = graph.TopologicalSort(docObject.graphs.deps);
        docObject.extra.blockOrder = order.vertexInOrder;
        docObject.graphs.dfsTree = order.dfsTree;
        docObject.graphs.tsTree = order.tsTree;
      } catch (error) {
        console.error(error)
        docObject = doAddError(docObject,{
          text: `${error.message}`,
          details: "Invalid dependencies in the document",
        })
        return docObject;
      }
      // process the blocks in the order 
      try {
        docObject.extra.blockOrder.map((block) => {
          const blockId = block.vertexId; 
          if (!docObject.data[blockId]) {
            throw new Error(`invocation error : the block "${blockId}" does not exists in the doc`)
          }
          let blockContent = docObject.data[blockId];
          // find all invocation annotations for the block 
          let invAnn = docObject.data[blockId].annotations.filter((itm) => {return itm["type"] == "invocation"})
          // process them 
          invAnn.map((inv) => {
            let mainText = blockContent.text;
            let targetText = docObject.data[inv.blockId].text;
            // TODO include the spaces in paddings
            mainText = mainText.replaceAll(inv.raw, targetText);
            blockContent.text = mainText;
            blockContent.process.push(`invocation ${inv.raw} processed`);
          });
        
          // let dt = { ...dataType };
          // let dtu = { ...dataTypeUtils };
          // let dataValue = dt[blockContent.dataType](blockContent, dtu);
          // blockContent.value = dataValue;
          // blockContent.process.push("datatype processed");
        })
      } catch (error) {
        console.error(error)
        docObject = doAddError(docObject,{
          text: `${error.message}`,
          details: "Some error while processing invocations",
        })
        return docObject;
      }

    }
  }

  // process actions annotations
  // TODO fix issue when append invocation are used. all actions are being replaced again.
  let actAnn = docObject.data[blockData.blockId].annotations.filter((itm) => {return itm.type == "action"})
  let blockContent = docObject.data[blockData.blockId];
  actAnn.map((act) => {
    let mainText = blockContent.text;
    blockContent.text = mainText.replace(act.raw, "");
    blockContent.process.push(`Action annotation ${act.raw} replaced`);
  });

  // process the data type
  // TODO
  return docObject
}

const doDeleteBlock = (doc,blockId) => {
  // changes to be made in : data , dep graph (all edges to and from ), knowledge graph (all edges to and from), blocks array 
  // TODO  check if block exists 
  doc.graphs.deps = graph.deleteVertex(doc.graphs.deps,blockId)
  doc.graphs.knowledge = graph.deleteVertex(doc.graphs.knowledge,blockId)
  let bIndex = doc.blocks.indexOf(blockId);
  doc.blocks.splice(bIndex, 1);
  delete doc.data[blockId] // todo : more is required : first check if all annotations realted to this node are deleted as well because gragps can be defined in other blocks as well
  return doc
}

const doEditBlock = (doc,blockId,changes)=>{
  //  we can only change the title and text 
  // TODO check if block exists
  let blockIdR = removeSpace(blockId)
  let block = {...doc.data[blockIdR]}
  let oldData = { title : block.title, text : block.source.first}
  // now check what needs to be changed
  let newData = {
    ... oldData,
    ... changes
  }
  // console.log(newData)
  let newBlock = `.[${blockId}] ${newData.title}  \n  ${newData.text}`
  doc =  doDeleteBlock(doc,blockIdR)
  doc = doAddNewBlock(doc,newBlock)
  return doc
}

const doDeleteKGEdge = (doc,fromBlockId,toBlockId)=>{
  // todo add validations
  let edgeObj = {...doc.graphs.knowledge.edges.find(itm=>{ return itm.v1 == fromBlockId && itm.v2 == toBlockId })}
  if(edgeObj){
    blockIdToEdit = edgeObj.temp.addedByBlock
    let blockContent = doc.data[blockIdToEdit] 
    // console.log(blockContent)
    let v1F = fromBlockId == blockIdToEdit ? "*" : fromBlockId
    let v2F = toBlockId == blockIdToEdit ? "*" : toBlockId
    annotationIndex = blockContent.annotations.findIndex(itm=>{return (itm["type"] == "edge" && itm["v1"]== v1F ) && itm["v2"]==v2F  })
    rawAnnotationText = blockContent.annotations[annotationIndex].raw
    blockContent.source.first = blockContent.source.first.replace(rawAnnotationText,"")
    // remove from the annotation array
    blockContent.annotations.splice(annotationIndex,1)
    blockContent.process.push(`Edge ${rawAnnotationText} removed`)
    // remove edge from the know graph
    doc.graphs.knowledge = graph.deleteEdge(doc.graphs.knowledge,fromBlockId,toBlockId)
    return doc
  }
  return doc
}

module.exports = {
  getBlankDocObject,
  doAddError, 
  doAddWarning, 
  doAddNewBlock,
  doDeleteBlock,
  doEditBlock,
  doDeleteKGEdge
}
},{"./graph.js":5}],3:[function(require,module,exports){
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
  return text
}
module.exports = decode
},{"./actions":2}],4:[function(require,module,exports){
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

},{"./actions.js":2}],5:[function(require,module,exports){
/*** 
the Graph program. Version 1.2.2 . 
Full source code is available at https://github.com/shubhvjain/graphs
Copyright (C) 2022  Shubh

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/> 

***/

 
const createGraph = (options = {}) => {
  const initialMetadata = { 
    title: options.title || "Graph " ,
    hasLoops: options.hasLoops || false,
    hasEdgeWeights: options.hasLoops || false,
    hasDirectedEdges: options.hasDirectedEdges || false,
    isSimple: options.isSimple || true
  }
  const initialOptions = {
    defaultNewEdgeLabel: options.defaultNewEdgeLabel || "" ,
    defaultNewVertexLabel:options.defaultNewVertexLabel || "", 
    defaultNewVertexWeight:options.defaultNewVertexWeight || "", 
    defaultNewEdgeWeight:options.defaultNewEdgeWeight || "",
    addBlankVertex: options.addBlankVertex|| true 
  }
  const theGraph = {
    vertices: {},
    edges: [],
    metadata: initialMetadata,
    options: initialOptions
  }
  return theGraph
} 


const addVertex = (graphData,options) =>{
  if(!options.id){
    if(!graphData.options.addBlankVertex){
      throw new Error ("No vertex id provided")
    }else{
      options.id = Math.floor(Math.random() * (50000) +1)
    }
  }
  if(graphData.vertices[options.id]){
    throw new Error("Vertex with same id already exists in the graph.")
  }
  graphData.vertices[options.id] = {
    label: options.label || options.id ,
    weight: 'weight' in options ? options.weight : graphData.options.defaultNewVertexWeight,
    data: options.data,
    temp: {...options.temp}
  }
  return graphData
  
}


const deleteVertex = (graphData, vertexId) => {
  // options = {id}
  if (!vertexId) {
    throw new Error("No vertex id provided");
  }
  if (graphData.vertices[vertexId]) {
    // will remove the vertex if it exists but will do nothing if it does not
    // throw new Error("Vertex with this id does not exists in the graph.")
    // gather all edges and delete them
    const edge1Search = graphData.edges.filter((edge) => edge.v1 == vertexId);
    for (const edge1 of edge1Search) {
      graphData = deleteSpecificEdge(graphData, edge1.v1, edge1.v2);
    }

    const edge2Search = graphData.edges.filter((edge) => edge.v2 == vertexId);
    for (const edge2 of edge2Search) {
      graphData = deleteSpecificEdge(graphData, edge2.v1, edge2.v2);
    }

    // remove the vertex
    delete graphData.vertices[vertexId];
    return graphData;
  } else {
    return graphData;
  }
};


const addEdge = (graphData,options)=>{

  if(!options.v1){throw new Error("Vertex 1 not provided")}
  if(!options.v2){throw new Error("Vertex 2 not provided")}
  
  if(!graphData.vertices[options.v1]){throw new Error(`Vertex 1 (${options.v1}) does not exists in the graph`)}
  if(!graphData.vertices[options.v2]){throw new Error(`Vertex 2 (${options.v2})  does not exists in the graph`)}

  const node1node2Search = graphData.edges.find(edge=>{return edge.v1 == options.v1 &&  edge.v2 == options.v2})
  const node2node1Search = graphData.edges.find(edge=>{return edge.v1 == options.v2 &&  edge.v2 == options.v1}) 

  if(graphData.metadata.isSimple){
    if(node1node2Search || node2node1Search ){ throw new Error(`Edge ${options.v1}--${options.v2} already exists in the simple graph`)}
  }

  let newEdge = {
    v1: options.v1,
    v2: options.v2, 
    weight:options.weight|| graphData.options.defaultNewEdgeWeight,
    label:options.label || graphData.options.defaultNewEdgeLabel,
    temp: {...options.temp}
  }

  graphData.edges.push(newEdge)

  return graphData

}

const deleteSpecificEdge = (graphData,v1,v2) => {
  // removes an edge from v1 to v2 (only, not the other way round)
  const edgeSearch = graphData.edges.findIndex(edge=>edge.v1 == v1 && edge.v2 == v2 )
  if(edgeSearch !== -1){graphData.edges.splice(edgeSearch,1)}
  return graphData
}

const deleteEdge = (graphData,fromVertex,toVertex) => {
  graphData = deleteSpecificEdge(graphData,fromVertex,toVertex)
  graphData = deleteSpecificEdge(graphData,toVertex,fromVertex)
  return graphData
}

const getVertexNeighbours = (graphData,vertexId)=>{
  if(!vertexId){throw new Error("No Vertex Id not provided")}
  if(!graphData.vertices[vertexId]){throw new Error("Vertex not found in the graph")}

  const node1Search = graphData.edges.filter(edge=>edge.v1 == vertexId)
  const node2Search = graphData.edges.filter(edge=>edge.v2 == vertexId) 

  let neighbours = { in:[], out:[], all:[]}

  node1Search.map(edge2=>{ 
    if(neighbours.all.indexOf(edge2.v2)==-1){   
      neighbours.all.push(edge2.v2)
      neighbours.out.push(edge2.v2)
    }
  })
  node2Search.map(edge1=>{ 
    if(neighbours.all.indexOf(edge1.v1)==-1){   
      neighbours.all.push(edge1.v1)
      neighbours.in.push(edge1.v1)
    }
  })
  if(graphData.metadata.hasDirectedEdges){
      return neighbours.out
  }else{
      return neighbours.all
  }

}


const getVertexDegree = (graphData,vertexId)=>{
  const neighbours = getVertexNeighbours(graphData,vertexId)
  return  neighbours.length 
}


const getVertexKeyMap = (graphData,options={vertexProperties:[],initialObjectValue:{}})=>{
  let keyMap = {}
  const allKeys = Object.keys(graphData.vertices)
  vertexProps = {
    'degree':(vertexId)=>{
      return getVertexDegree(graphData,vertexId)
    }
  }
  allKeys.map(ky=>{
     keyMap[ky] =  {...options.initialObjectValue}
     options.vertexProperties.map(prop=>{
        keyMap[ky][prop] = vertexProps[prop](ky)
     })
  })
  return keyMap
}


const printEdges = (graphData)=>{
  graphData.edges.map(edge=>{
    console.log(` ${edge.v1}  ---  ${edge.v2} `)
  })
}


// const fs = require("fs/promises");
const generateGraphPreview = async (graphs,options)=>{
  // const saveSomethingInSomefile = async(fileContent,filePath) =>{
  //     await fs.writeFile(filePath, fileContent);
  // }
  const generateHTMLBodyForGraphs = (inputGraphs) =>{
    let graphHtml = ""
    inputGraphs.map((graph,index)=>{
        let vertexInVisFormat = []
        const vertex = Object.keys(graph.vertices)
        vertex.map((v,inx)=>{
          let label = `${options.showVertexCreatedOrder?"("+inx+")     ":""}${graph['vertices'][v]['label']|| v}  `
          vertexInVisFormat.push( { id:v , label: label  } )
          })
        let edgesInVisFormat = []
        graph.edges.map(e=>{
          let newEdge = { from : e.v1, to: e.v2, color: e.temp['color']  }
          if(e.label){newEdge['label'] = e['label']}
          edgesInVisFormat.push(newEdge)
        })
        let visOptions = {
          "nodes":{"shape":"box"}
        }
        if(graph.metadata.hasDirectedEdges){visOptions['edges'] = { arrows: 'to'}}
        const dataForViz = {nodes : vertexInVisFormat,edges:  edgesInVisFormat,options: visOptions}
        graphHtml += `
            <h2> #${index+1}. ${graph.metadata.title}</h2>
            <div class="graph" id="graph${index}"></div>
            <details><summary>GraphData</summary><pre>${JSON.stringify(graph,null,2)}</pre></details>
            <script>
              let dataForViz${index} = ${JSON.stringify(dataForViz)}
              const container${index} = document.getElementById('graph${index}')
              const data${index} = {
                nodes: new vis.DataSet(dataForViz${index}.nodes),
                edges: new vis.DataSet(dataForViz${index}.edges)
              }
              let network${index} = new vis.Network(container${index}, data${index}, ${JSON.stringify(dataForViz['options'])});
            </script>`
      })
      return graphHtml
  }

  const formats = {
    'html':async ()=>{
      if(!options.outputPath){throw new Error("Path for output file not provided") }
      let graphHtml =  generateHTMLBodyForGraphs(graphs)
      const htmlTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script><title>Graphs</title></head>
      <body><style>.graph {width: 90%; height: 80vh; border: 1px solid #80808036;}</style>${graphHtml}</body></html>`
      //await saveSomethingInSomefile(htmlTemplate,options.outputPath)
      return {"message": "Saved",htmlTemplate: htmlTemplate}
    },
    'htmlParts':async ()=>{
      let graphHtml =  generateHTMLBodyForGraphs(graphs)
      let htmlParts = {
        head:` <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>`,
        body: `<style>.graph {width: 90%; height: 80vh; border: 1px solid #80808036;}</style>${graphHtml}`
      }
      return htmlParts
    }
  }
  if(!options.format){throw new Error("Specify a format. Available foramts: "+Object.keys(formats))}
  try{
    const response = await formats[options.format]()
    return response
  }catch(error){console.log(error)}
}


const BreadthFirstSearch = (graphData,sourceVertexId)=>{
  if(!graphData.vertices[sourceVertexId]){throw new Error("Source vertex not found")}
  
  let graphCopy = JSON.parse(JSON.stringify(graphData))
  graphCopy.vertices[sourceVertexId].temp = {visited: true}

  let theTree = createGraph({title:`BFS tree starting with node ${sourceVertexId}`})
  theTree = addVertex(theTree,{id:sourceVertexId,weight:0})

  let queue = []
  queue.push(sourceVertexId)
  
  while(queue.length > 0){
      const aNode =  queue.shift()
      const sourceNeighbours = getVertexNeighbours(graphCopy,aNode)
      sourceNeighbours.map(neighbour=>{
        const alreadyVisited = 'visited'  in  graphCopy.vertices[neighbour]['temp']
        if(!alreadyVisited){
          queue.push(neighbour)
          predcessorWeight = theTree.vertices[aNode]['weight']
          theTree = addVertex(theTree,{id:neighbour,weight:predcessorWeight+1})
          theTree = addEdge(theTree,{v1:aNode,v2:neighbour})
          graphCopy.vertices[neighbour]['temp']['visited'] = true
        }
      })
  }
  return theTree
}


const DepthFirstSearch = (graphData)=>{
  let visited = getVertexKeyMap(graphData,{vertexProperties:["degree"], initialObjectValue :{color:'white', pi: null, d: 0, f:0}})
  //let allVertices = []
  //Object.keys(visited).map(itm=>{allVertices.push({vertex: itm,degree: visited[itm]['degree']})})
  //allVertices = allVertices.sort((a,b)=>{return b.degree - a.degree})
  let time = 0
  let otherEdges = []
  const DFS = () =>{
    Object.keys(graphData.vertices).map(vertex =>{
      if (visited[vertex]['color']=='white'){
        DFS_VISIT(vertex)
      }
    })
  }
  const DFS_VISIT = (u) =>{
    time = time +1 
    visited[u]['d'] = time
    visited[u]['color'] = 'grey'
    const neighbours = getVertexNeighbours(graphData,u) 
    neighbours.map(neighbour=>{
      if (visited[neighbour].color=='white'){
          visited[neighbour]['pi'] = u
          DFS_VISIT(neighbour)
        }else{
          let eType = visited[neighbour]['color']=="grey" ? "backward-edge":  "cross-edge"
          otherEdges.push({
            v1: u,
            v2: neighbour,
            label: eType ,
            temp: {color: eType=="backward-edge" ? "red" : "violet"  }
          })
        }
      })
      visited[u]['color'] = 'black'
      time = time + 1
      visited[u]['f'] = time 
  }
  DFS()
  let theDFSGraph = createGraph({title:`DFS Forest`, hasDirectedEdges: true})
  Object.keys(graphData.vertices).map(v=>{
    theDFSGraph = addVertex(theDFSGraph,
      {
        id:v, 
        label: `${v} (d=${visited[v]['d']},f=${visited[v]['f']})` ,
        temp: visited[v]
      })
  })
  Object.keys(visited).map(ver=>{ 
    if(visited[ver]['pi']){
      theDFSGraph = addEdge(theDFSGraph,{v1: visited[ver]['pi'] , v2: ver, label:"tree-edge", temp: {color:'green'}})
    }
  })
  otherEdges.map(edg=>{
      theDFSGraph = addEdge(theDFSGraph,edg)
  })
  return theDFSGraph
}


const CheckForCyclesInGraph = (graphData) => {
  const DFSTree = DepthFirstSearch(graphData)
  const backEdges = DFSTree.edges.filter(edge=>{return edge.label=='backward-edge'})
  return { cycleExists : backEdges.length > 0   , edges: backEdges, dfsTree : DFSTree }
}


const TopologicalSort = (graphData)=>{
  const cycleCheck = CheckForCyclesInGraph(graphData)
  if(cycleCheck.cycleExists){
    throw new Error("This graph has cycles. Topological sort not possible")
  }
  let tSortedGraph = createGraph({title:`Topological sorting`, hasDirectedEdges: true})
  tSortedGraph.vertices  =  JSON.parse(JSON.stringify(cycleCheck.dfsTree.vertices))
  let vertexOrder = []
  Object.keys(cycleCheck.dfsTree.vertices).map(v=>{
    vertexOrder.push({vertexId:v,fVal : cycleCheck.dfsTree.vertices[v]['temp']['f'] })
  })
  vertexOrder = vertexOrder.sort((a,b)=>{ return a.fVal - b.fVal })
  
  for(let i = 0; i <= vertexOrder.length - 2  ; i++ ){
    tSortedGraph = addEdge(tSortedGraph,{v1:vertexOrder[i]['vertexId'] , v2: vertexOrder[i+1]['vertexId'] })
  }
  return  { vertexInOrder : vertexOrder, dfsTree : cycleCheck.dfsTree  , tsTree: tSortedGraph  }
};


module.exports = {
  createGraph,
  addVertex,
  deleteVertex,
  addEdge,
  deleteEdge,
  getVertexNeighbours,
  getVertexDegree,
  getVertexKeyMap,
  printEdges,
  generateGraphPreview,
  BreadthFirstSearch,
  DepthFirstSearch,
  CheckForCyclesInGraph,
  TopologicalSort
}

},{}]},{},[1])(1)
});
