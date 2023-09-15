// code to perform actions on a document object and  maintain its validity

/**
 * valid actions 
 * get blank document [done]
 * add a new block in a document [done]
 * relate one block with another 
 * edit block : modify text, modify edges
 * delete block 
 * add a new block and relate it to another block at the same time
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
    processed: false, // indicates whether the annotation is processed or not 
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
    source: { raw: [], first: ""},
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
    if (blockTitle.trim().length==0){
      blockTitle = `Block ${dec.blockId}`
    }
    const newTextWithoutTitle = lines.join('\n');
    let newText =  newTextWithoutTitle
    blockData = {
      ...newBlockData,
      text: newText,
      blockId: dec.blockId,
      title: blockTitle,
      // data type should be processed at the end of processing all annotations
      source: { raw: [blockText], first: newText}, // this has the raw text, unprocessed further while processing annotations
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
      source: { raw: [blockText], first: blockText},
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
    docObject.graphs.knowledge = graph.addEdge(docObject.graphs.knowledge, { v1: v1, v2: v2, label: ed.label});
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
  delete doc.data[blockId]
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
  console.log(newData)
  let newBlock = `.[${blockId}] ${newData.title}  \n  ${newData.text}`
  doc =  doDeleteBlock(doc,blockIdR)
  doc = doAddNewBlock(doc,newBlock)
  return doc
}

module.exports = {
  getBlankDocObject,
  doAddError, 
  doAddWarning, 
  doAddNewBlock,
  doDeleteBlock,
  doEditBlock
}