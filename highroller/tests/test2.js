// whole enchilada test - goes from JSON format of riesenroller to
// verilog :D
let format = {"nodes":[{"x":170,"y":-61,"text":"WAIT_READ"},{"x":726,"y":47,"text":"WAIT_WRITE"},{"x":1120,"y":100,"text":"WRITE_DELAY"},{"x":1295,"y":349,"text":"WRITE0"},{"x":946,"y":515,"text":"WRITE1"},{"x":495,"y":486,"text":"WRITE2"},{"x":283,"y":306,"text":"WRITE3"}],"links":[{"type":"StartLink","node":0,"text":"","deltaX":-166,"deltaY":-98},{"type":"Link","nodeA":0,"nodeB":1,"text":"~fifo_empty / buf_en, fifo_read","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":-30},{"type":"Link","nodeA":1,"nodeB":2,"text":"free_outbound /","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":-30},{"type":"SelfLink","node":1,"text":"~free_outbound /","anchorAngle":1.0906212971913698},{"type":"Link","nodeA":2,"nodeB":3,"text":"/ put_outbound, sel=0","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":-30},{"type":"Link","nodeA":3,"nodeB":4,"text":"/ put_outbound, sel = 1","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":-30},{"type":"Link","nodeA":4,"nodeB":5,"text":"/ put_outbound, sel = 2","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":-30},{"type":"Link","nodeA":5,"nodeB":6,"text":"/ put_outbound, sel = 3","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":-30},{"type":"Link","nodeA":6,"nodeB":1,"text":"~fifo_empty / buf_en, fifo_read","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":-30},{"type":"Link","nodeA":6,"nodeB":0,"text":"fifo_empty / buf_en","lineAngleAdjust":0,"parallelPart":0.44757699290088065,"perpendicularPart":-114.19225498181136}],"canvasWidth":1500,"canvasHeight":800};

function convert(obj, meta) {
  let output = {};
  output.version = 2;
  output.meta = meta;
  output.machine = {};
  output.machine.nodes = obj.nodes.map((x, i) => {
    return {
      id: i,
      name: x.text
    };
  });
  output.machine.edges = obj.links.map((x, i) => {
    let res = {};
    if (x.type == 'StartLink') {
      if (output.meta.reset) {
        // TODO: send message to user that we are overwriting the reset node
      }
      output.meta.reset = x.node;
      return;
    } else if (x.type == 'Link') {
      res.start = x.nodeA;
      res.end = x.nodeB;
    } else if (x.type == 'SelfLink') {
      res.start = x.node;
      res.end = x.node;
    }

    let condOut = x.text.split('/');
    if (condOut.length != 2) {
      // oops
    }
    res.condition = condOut[0].split(' ').join('');
    let outputVars = condOut[1].split(' ').join('');
    res.output = outputVars.length > 0 ? outputVars.split(',') : [];

    return res;
  }).filter(x => x);

  return output;
}

let meta = {
  name: "NFTB_fsm",
  // reset state will be determined
  signals: {
    // signals (input/output) 
    input: [
      {
        // input signals have a name and a width
        name: "fifo_empty",
        width: 1
      },
      {name: "free_outbound", width: 1}
    ],
    output: [
      // output signals also have an extra parameter:
      // for width = 1 signals, if they are inverted
      // inverted == true if they are ACTIVE LOW
      // inverted == false if they are ACTIVE HIGH
      // for width > 1 signals, a "default" setting (if not specified, defaults to 0)
      {name: "fifo_read", width: 1, inverted: false},
      {name: "buf_en", width: 1, inverted: false},
      {name: "sel", width: 2},
      {name: "put_outbound", width: 1, inverted: false}
    ]
  }
};

console.log(format);
let testobj = convert(format, meta);
console.log(JSON.stringify(testobj, null, 2));

// log levels go from 0 (debug) to 5 (bad)
const TEST_OPTIONS = {
  // options for outputType:
  // file (have stuff like `default_nettype + module),
  // module (input/output, etc.). Use name as module name
  // code (just the FSM itself)
  outputType: "file",
  // clock and reset options are only used for file/module options
  clock: {
    // name of the clock signal
    name: "clock",
    // edge to care about (options are posedge or negedge)
    edge: "posedge"
  },
  reset: {
    // name of reset signal
    name: "reset_n",
    // edge to care about (options are posedge or negedge)
    edge: "negedge"
  },
  // in case we need to remap
  cstate: "cstate",
  nstate: "nstate",
  // style:
  style: {
    // indent by what (can put spaces/tabs/whatever in here)
    indent: "  ",
    // skip outputting the transition to same state
    skipOutputTransitionToSameState: true,
  },
  // the logger to use
  logger: function(level, message) {
    console.log(`Log ${level}: ${message}`);
  },
};

const highroller = require('../src/index.js');

console.log(highroller.convert(testobj, TEST_OPTIONS));
