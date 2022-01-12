const LogLevel = {
  DEBUG: 0,   // just debug stuff
  INTERNAL: 2,// something wacky happened internally, output might be weird
  WARNING: 3, // something bad in user input, but should be fine
  ERROR: 4,   // something really bad in user input, output will probably be wrong
  FATAL: 5    // something terrible in user input, no output possible
};

// TODO: big issue: inverted signals should be able to be input
// this goes into a larger question of how to handle inverted signals nicely

// function to make a nicer representation of the fsm
// nicer = nodes and edges are mixed
// takes in opts only for the logger
let make_nicer_fsm = function(fsm, opts) {
  let nodeMap = {};
  var i;

  if (fsm.machine.nodes.length < 2) {
    opts.logger(LogLevel.FATAL, `Not enough nodes!`);
    return;
  }

  // nodes
  for (i = 0; i < fsm.machine.nodes.length; i++) {
    var currNode = fsm.machine.nodes[i];
    if (nodeMap.hasOwnProperty(currNode.id)) {
      opts.logger(LogLevel.ERROR, `Conflicting node ID ${currNode.id} between node ${nodeMap[currNode.id].name} and ${currNode.name}; skipping ${currNode.name}`);
      continue;
    }
    // TODO: name check the node names to make sure they're ok for SV
    nodeMap[currNode.id] = currNode;
    nodeMap[currNode.id].edges = [];
    nodeMap[currNode.id].targets = 0;
  }

  // edges
  for (i = 0; i < fsm.machine.edges.length; i++) {
    var currEdge = fsm.machine.edges[i];
    if (!nodeMap.hasOwnProperty(currEdge.start)) {
      opts.logger(LogLevel.ERROR, `Edge #${i} has unknown start node ${currEdge.start}; skipping edge`);
      continue;
    }
    if (!nodeMap.hasOwnProperty(currEdge.end)) {
      opts.logger(LogLevel.ERROR, `Edge #${i} has unknown end node ${currEdge.end}; skipping edge`);
      continue;
    }
    nodeMap[currEdge.start].edges.push(currEdge);
    nodeMap[currEdge.end].targets += 1;
  }

  // convert back to an array
  var nodeArr = Object.values(nodeMap);

  // check that there are no floating nodes
  for (i = 0; i < nodeArr.length; i++) {
    if (nodeArr[i].targets == 0) {
      opts.logger(LogLevel.WARNING, `Node ID ${nodeArr[i].id} has no edges going to it`, [`n${nodeArr[i].id}`]);
    }
  }

  // check that we have a node with the id to start at
  if (!fsm.meta.hasOwnProperty('reset')) {
    opts.logger(LogLevel.FATAL, `No reset state specified!`);
    return;
  }
  if (!nodeMap.hasOwnProperty(fsm.meta.reset)) {
    opts.logger(LogLevel.FATAL, `Invalid reset state ID #${fsm.meta.reset} specified!`);
    return;
  }

  // check that we don't have overlapping conditions
  // TODO: use some sort of SAT solver to check for full coverage
  for (i = 0; i < nodeArr.length; i++) {
    var transitionConditions = nodeArr[i].edges.map(x => x.condition);
    var numUnconditionalTransitions = transitionConditions.reduce((prev, curr) => {prev + (curr ? 1 : 0)}, 0);
    if (numUnconditionalTransitions > 1) {
      opts.logger(LogLevel.ERROR, `Node ID ${nodeArr[i].id} has multiple unconditional transitions going out of it!`, [`n${nodeArr[i].id}`]);
    }
  }

  return nodeMap;
};

// function to make a nicer representation of the signals
// mostly turns the array of output signals into a map
// also does some validation
let make_nicer_signals = function(fsm, opts) {
  let signalMap = {};
  var i = 0;

  for (i = 0; i < fsm.meta.signals.output.length; i++) {
    var currSignal = fsm.meta.signals.output[i];
    signalMap[currSignal.name] = currSignal;
    if (!currSignal.hasOwnProperty("default")) {
      if (currSignal.inverted) {
        signalMap[currSignal.name].default = "1'b1";
      } else {
        signalMap[currSignal.name].default = `${currSignal.width}'${currSignal.width == 1 ? 'b' : 'd'}0`;
      }
    }
    // value when asserted
    if (currSignal.width == 1) {
      if (currSignal.inverted) {
        signalMap[currSignal.name].asserted = `1'b0`;
      } else {
        signalMap[currSignal.name].asserted = `1'b1`;
      }
    }
  }

  var checkStr;

  // validation - check to make sure all nodes' outputs are only of the known set
  for (i = 0; i < fsm.machine.nodes.length; i++) {
    // no outputs
    if (!fsm.machine.nodes[i].output) continue;
    for (var j = 0; j < fsm.machine.nodes[i].output.length; j++) {
      checkStr = fsm.machine.nodes[i].output[j].split("=");
      if (checkStr.length == 2) {
        // had equals sign, so there might be spaces after. strip them off.
        checkStr = checkStr[0].split(" ").join("");
      } else if (checkStr.length == 1) {
        checkStr = checkStr[0];
      } else {
        // error
        opts.logger(LogLevel.ERROR, `Bad output \`${fsm.machine.nodes[i].output[j]}\` in node #${i} output #${j}`, [`n${i}.o${j}`]);
        return;
      }

      // check that this signal exists
      if (!signalMap.hasOwnProperty(checkStr)) {
        opts.logger(LogLevel.WARNING, `Node #${i} output #${j} is not a valid output!`, [`n${i}.o${j}`]);
      }
    }
  }

  // validation - check to make sure all edges' outputs are only this
  for (i = 0; i < fsm.machine.edges.length; i++) {
    for (var j = 0; j < fsm.machine.edges[i].output.length; j++) {
      checkStr = fsm.machine.edges[i].output[j].split("=");
      if (checkStr.length == 2) {
        // had equals sign, so there might be spaces after. strip them off.
        checkStr = checkStr[0].split(" ").join("");
      } else if (checkStr.length == 1) {
        checkStr = checkStr[0];
      } else {
        // error
        opts.logger(LogLevel.ERROR, `Bad output \`${fsm.machine.edges[i].output[j]}\` in edge #${i} output #${j}`, [`e${i}.o${j}`]);
        return;
      }

      // check that this signal exists
      if (!signalMap.hasOwnProperty(checkStr)) {
        opts.logger(LogLevel.WARNING, `Edge #${i} output #${j} is not a valid output!`, [`e${i}.o${j}`]);
      }
    }
  }

  return signalMap;
};

// conversion function
// takes in 2 args - the fsm and options. see test.js for example.
exports.convert = function(fsm, opts) {
  let output = [];
  let currIndent = 0;
  let niceFsm;
  let niceSignals;

  if (fsm.version != 2 && fsm.version != 3) {
    opts.logger(LogLevel.FATAL, `Expected version 2 or 3, not ${fsm.version}`);
    return;
  }

  niceFsm = make_nicer_fsm(fsm, opts);
  if (!niceFsm) return;

  // TODO: check if all signal names are ok for SV
  // TODO: maybe ensure that there is at least one input and output signal?
  niceSignals = make_nicer_signals(fsm, opts);
  if (!niceSignals) return;

  // line to emit, plus amount to adjust indent
  // if adjust is positive, it will adjust after.
  // if adjust is negative, it will adjust before.
  // also, this will remove a +1 and -1 if there is no 0 in between
  let sawZero = false;
  let lastSawOneIdx = 0;
  let emit_line = function(indentAdjust, line) {
    if (indentAdjust < 0) {
      currIndent += indentAdjust;
      if (!sawZero) {
        // need to wipe to index of last seen +1
        opts.logger(LogLevel.DEBUG, `Slicing out lines ${lastSawOneIdx} to ${output.length}`);
        output = output.slice(0, lastSawOneIdx-1);
        lastSawOneIdx = output.length;
        sawZero = true;
        // also skip adding output
        return;
      }
    }
    output.push(`${(opts.style.indent.repeat(currIndent))}${line}`);
    if (indentAdjust == 0) {
      sawZero = true;
    }
    // for now, only do it for one level deep
    if (indentAdjust > 0) {
      currIndent += indentAdjust;
      sawZero = false;
      lastSawOneIdx = output.length;
    }
  };

  let gen_file_header = function() {
    emit_line(0, "`default_nettype none");
    emit_line(0, "");
  };

  let gen_module_header = function() {
    // TODO: support parameters
    var i = 0, signalInQuestion, extra;

    emit_line(1, `module ${fsm.meta.name} (`);
    emit_line(0, `input logic ${opts.clock.name}, ${opts.reset.name},`);

    // inputs
    for (i = 0; i < fsm.meta.signals.input.length; i++) {
      signalInQuestion = fsm.meta.signals.input[i];
      extra = signalInQuestion.width > 1 ? ` [${signalInQuestion.width-1}:0]` : ``;
      emit_line(0, `input logic${extra} ${signalInQuestion.name},`);
    }

    // outputs
    for (i = 0; i < fsm.meta.signals.output.length; i++) {
      signalInQuestion = fsm.meta.signals.output[i];
      extra = signalInQuestion.width > 1 ? ` [${signalInQuestion.width-1}:0]` : ``;
      emit_line(0, `output logic${extra} ${signalInQuestion.name}${i == (fsm.meta.signals.output.length - 1)?``:`,`}`);
    }

    emit_line(0, `);`);
    emit_line(0, ``);
  };

  let gen_enum = function() {
    var i = 0;
    let enumWidth = Math.ceil(Math.log2(fsm.machine.nodes.length));
    emit_line(1, `enum logic [${enumWidth - 1}:0] {`);
    for (i = 0; i < fsm.machine.nodes.length; i++) {
      emit_line(0, `${fsm.machine.nodes[i].name}${i == (fsm.machine.nodes.length - 1) ? `` : `,`}`);
    }
    emit_line(-1, `} ${opts.cstate}, ${opts.nstate};`);
  };

  let gen_comb_preamble = function() {
    var i = 0;
    emit_line(1, `always_comb begin`);
    emit_line(0, `${opts.nstate} = ${opts.cstate};`);

    // default all outputs to unasserted
    for (i = 0; i < fsm.meta.signals.output.length; i++) {
      var currSignal = fsm.meta.signals.output[i];
      emit_line(0, `${currSignal.name} = ${niceSignals[currSignal.name].default};`);
    }

    emit_line(0, ``);
  };

  let format_single_output = function(outputSignal, value) {
    if (value) {
      let val_str = isNaN(parseInt(value, 10)) ? value : `${niceSignals[outputSignal].width}'d${value}`;
      emit_line(0, `${outputSignal} = ${val_str};`);
    } else {
      if (niceSignals.hasOwnProperty(outputSignal))
        emit_line(0, `${outputSignal} = ${niceSignals[outputSignal].asserted};`);
      else {
        opts.logger(LogLevel.ERROR, `Unknown signal name ${outputSignal}`);
      }
    }
  };

  let format_outputs = function(outputsArr) {
    for (var i = 0; i < outputsArr.length; i++) {
      var checkStr = outputsArr[i].split("=");
      if (checkStr.length == 2) {
        // had equals sign, so there might be spaces after. strip them off.
        format_single_output(checkStr[0].split(" ").join(""), checkStr[1].split(" ").join(""));
      } else {
        format_single_output(checkStr[0]);
      }
    }
  };

  let gen_case_item = function(state) {
    emit_line(1, `${state.name}: begin`);

    // state outputs go first
    if (state.output) {
      format_outputs(state.output);
    }

    for (var i = 0; i < state.edges.length; i++) {
      var currEdge = state.edges[i];
      if (currEdge.condition) {
        emit_line(1, `if (${currEdge.condition}) begin`);
      }

      format_outputs(currEdge.output);
      // skip outputting staying in same state
      if ((currEdge.end != state.id) && opts.style.skipOutputTransitionToSameState)
        emit_line(0, `${opts.nstate} = ${niceFsm[currEdge.end].name};`);

      if (currEdge.condition) {
        emit_line(-1, `end`);
      }
    }

    emit_line(-1, `end`);
  };

  // the chonky boi
  let gen_case = function() {
    emit_line(1, `case (${opts.cstate})`);

    for (var i = 0; i < fsm.machine.nodes.length; i++) {
      gen_case_item(fsm.machine.nodes[i]);
    }

    emit_line(-1, `endcase`);
  };

  let gen_comb_epilogue = function() {
    emit_line(-1, `end`);
  };

  let gen_ff = function(reset_state_name) {
    emit_line(1, `always_ff @(${opts.clock.edge} ${opts.clock.name}, ${opts.reset.edge} ${opts.reset.name}) begin`);
    let resetLine = `if (`;
    resetLine += opts.reset.edge == "negedge" ? `!${opts.reset.name}` : `${opts.reset.name}`;
    resetLine += `) ${opts.cstate} <= ${reset_state_name};`;
    emit_line(0, resetLine);
    emit_line(0, `else ${opts.cstate} <= ${opts.nstate};`);
    emit_line(-1, `end`);
  };

  let gen_module_footer = function() {
    emit_line(0, ``);
    emit_line(-1, `endmodule : ${fsm.meta.name}`);
  };

  emit_line(0, `// Automatically generated by ferris highroller on ${new Date().toLocaleString()}`);

  if (opts.outputType == "file") gen_file_header();
  // gen module header/footer if we're file or module
  if (opts.outputType != "code") gen_module_header();

  gen_enum();
  emit_line(0, ``);
  gen_comb_preamble();
  gen_case();
  gen_comb_epilogue();

  // gen ff logic
  // figure out name of reset state
  gen_ff(niceFsm[fsm.meta.reset].name);

  // gen module header/footer if we're file or module
  if (opts.outputType != "code") gen_module_footer();

  if (currIndent) opts.logger(LogLevel.INTERNAL, "Indentation was non-zero at fin. Output might look weird, or there was a bad error when converting.");

  return output.join('\n');
};
