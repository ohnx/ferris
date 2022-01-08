const DEFAULT_SETUP = {
  "projectName": "NFTB_fsm",
  "sidebarShowing": true,
  "sidebarItem": "help-text",
  "inputSignals": [
    {
      "name": "fifo_empty",
      "width": 1
    },
    {
      "name": "free_outbound",
      "width": 1
    }
  ],
  "outputSignals": [
    {
      "name": "fifo_read",
      "width": 1,
      "inverted": false
    },
    {
      "name": "buf_en",
      "width": 1,
      "inverted": false
    },
    {
      "name": "sel",
      "width": 2
    },
    {
      "name": "put_outbound",
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
        "text": "WAIT_READ"
      },
      {
        "x": 376,
        "y": 47,
        "text": "WAIT_WRITE"
      },
      {
        "x": 770,
        "y": 100,
        "text": "WRITE_DELAY"
      },
      {
        "x": 945,
        "y": 349,
        "text": "WRITE0"
      },
      {
        "x": 596,
        "y": 515,
        "text": "WRITE1"
      },
      {
        "x": 145,
        "y": 486,
        "text": "WRITE2"
      },
      {
        "x": -67,
        "y": 306,
        "text": "WRITE3"
      }
    ],
    "links": [
      {
        "type": "StartLink",
        "node": 0,
        "text": "",
        "deltaX": -166,
        "deltaY": -98
      },
      {
        "type": "Link",
        "nodeA": 0,
        "nodeB": 1,
        "text": "~fifo_empty / buf_en, fifo_read",
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "Link",
        "nodeA": 1,
        "nodeB": 2,
        "text": "free_outbound /",
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "SelfLink",
        "node": 1,
        "text": "~free_outbound /",
        "anchorAngle": 1.0906212971913698
      },
      {
        "type": "Link",
        "nodeA": 2,
        "nodeB": 3,
        "text": "/ put_outbound, sel=0",
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "Link",
        "nodeA": 3,
        "nodeB": 4,
        "text": "/ put_outbound, sel = 1",
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "Link",
        "nodeA": 4,
        "nodeB": 5,
        "text": "/ put_outbound, sel = 2",
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "Link",
        "nodeA": 5,
        "nodeB": 6,
        "text": "/ put_outbound, sel = 3",
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "Link",
        "nodeA": 6,
        "nodeB": 1,
        "text": "~fifo_empty / buf_en, fifo_read",
        "lineAngleAdjust": 0,
        "parallelPart": 0.5,
        "perpendicularPart": -30
      },
      {
        "type": "Link",
        "nodeA": 6,
        "nodeB": 0,
        "text": "fifo_empty / buf_en",
        "lineAngleAdjust": 0,
        "parallelPart": 0.44757699290088065,
        "perpendicularPart": -114.19225498181136
      },
      {
        "type": "SelfLink",
        "node": 0,
        "text": "fifo_empty / buf_en",
        "anchorAngle": 0.9048270894157867
      }
    ],
    "scale": 0.8200000000000003,
    "position": {
      "x": 455,
      "y": 335
    }
  }
};
