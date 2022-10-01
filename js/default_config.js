const DEFAULT_SETUP = {
  "projectName": "NFTB_fsm",
  "sidebarShowing": true,
  "sidebarItem": "help-text",
  "inputSignals": [
    {
      "name": "buf_empty",
      "width": 1
    }
  ],
  "outputSignals": [
    {
      "name": "buf_en",
      "width": 1,
      "inverted": false
    },
    {
      "name": "sel",
      "width": 2,
      "default": "0"
    },
    {
      "name": "writing",
      "width": 1,
      "inverted": false
    }
  ],
  "opts": {
    "outputType": "file",
    "clock": {
      "name": "clock",
      "edge": "posedge"
    },
    "reset": {
      "name": "reset_n",
      "edge": "negedge"
    },
    "cstate": "cstate",
    "nstate": "nstate",
    "style": {
      "indent": "  ",
      "skipOutputTransitionToSameState": true
    }
  },
  "nodesize": 80,
  "riesenradState": {
    "nodes": [
      {
        "x": -180,
        "y": -61,
        "name": "INITIAL",
        "outputs": []
      },
      {
        "x": 556.6518706404567,
        "y": 25.25364616360179,
        "name": "WRITE1",
        "outputs": []
      },
      {
        "x": 412.2637920101458,
        "y": 360.06467977171843,
        "name": "WRITE2",
        "outputs": []
      },
      {
        "x": -67,
        "y": 306,
        "name": "WRITE3",
        "outputs": []
      },
      {
        "x": 203.2894736842105,
        "y": -99.34210526315788,
        "name": "WAIT_WRITE",
        "outputs": []
      }
    ],
    "links": [
      {
        "type": "StartLink",
        "node": 0,
        "deltaX": -166,
        "deltaY": -98
      },
      {
        "type": "Link",
        "nodeA": 2,
        "nodeB": 3,
        "condition": "",
        "outputs": [
          "writing",
          "sel=3"
        ],
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "Link",
        "nodeA": 3,
        "nodeB": 0,
        "condition": "buf_empty",
        "outputs": [
          "buf_en"
        ],
        "lineAngleAdjust": 0,
        "parallelPart": 0.21844676376708133,
        "perpendicularPart": -86.22993103108988
      },
      {
        "type": "SelfLink",
        "node": 0,
        "condition": "buf_empty",
        "outputs": [
          "buf_en"
        ],
        "anchorAngle": 0.6590195522539115
      },
      {
        "type": "Link",
        "nodeA": 1,
        "nodeB": 2,
        "condition": "",
        "outputs": [
          "writing",
          "sel=2"
        ],
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "Link",
        "nodeA": 4,
        "nodeB": 1,
        "condition": "",
        "outputs": [
          "writing",
          "sel=1"
        ],
        "lineAngleAdjust": 0,
        "parallelPart": 0.5904387207467147,
        "perpendicularPart": -33.20890830413306
      },
      {
        "type": "Link",
        "nodeA": 0,
        "nodeB": 4,
        "condition": "~buf_empty",
        "outputs": [
          "buf_en"
        ],
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "Link",
        "nodeA": 3,
        "nodeB": 4,
        "condition": "~buf_empty",
        "outputs": [
          "buf_en"
        ],
        "lineAngleAdjust": 0,
        "parallelPart": 0.6741808835905673,
        "perpendicularPart": 86.87101966944181
      }
    ],
    "scale": 0.7600000000000001,
    "position": {
      "x": 438,
      "y": 369
    }
  }
};
