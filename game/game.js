Element.prototype.on = Element.prototype.addEventListener;
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame;
window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.oCancelAnimationFrame;
window.Matrix = window.WebKitCSSMatrix || window.MSCSSMatrix || window.CSSMatrix;

var game = (function(){
  var _canvas = document.querySelector('#game-canvas'),
      _scene = document.querySelector('#game-scene'),
      _templates = {
        car: document.querySelector('#car-template'),
        level: document.querySelector('#level-template')
      },
      _startTime = null,
      _player,
      _level,
      _playerController;


  function initObjects () {
    _player = new Car();
    _level = new Level();
    _playerController = new PlayerController(_player);

    _level.add(_player,'children');
    _scene.appendChild(_level.el);

    window.player = _player;
    window.level = _level;
  }

  function onStep () {
    _playerController.update();

    _player
      .update()
      .render();

    _level
      .update()
      .render();
  }

  function Car () {
    Templatable(this, 'car');
    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);
    Physicsable(this);

    this.wheels = {
      fl: {
        el: this.el.getElementsByClassName('wheel-f-l')[0]
      },
      fr: {
        el: this.el.getElementsByClassName('wheel-f-r')[0]
      },
      rl: {
        el: this.el.getElementsByClassName('wheel-r-l')[0]
      },
      rr: {
        el: this.el.getElementsByClassName('wheel-r-r')[0]
      }
    };

    this.width = 33;
    this.height = 100;
    this.pos.x = 200;
    this.pos.y = 5700;
    this.pos.z = 10;
    this.speed = 18;
    this.responsiveness = 1;
    this.straighteningRate = 0.98;
    this.maxRotation = 30;

    this.el.style.width = this.width + 'px';
    this.el.style.height = this.height + 'px';

    this.update = function () {
      var leanOrigin = '50% 50%';
      if (this.vel) {

        //--- TURN
        this.rotation.z = this.rotation.z >  this.maxRotation ?  this.maxRotation : this.rotation.z;
        this.rotation.z = this.rotation.z < -this.maxRotation ? -this.maxRotation : this.rotation.z;

        //--- TURN LEVEL
        _level.rotation.z = this.rotation.z * 0.02;

        // derive vel from turning angle
        this.vel.x = -this.speed * this.rotation.z / 90;
        // increment pos
        this.pos.x -= this.vel.x;


        //--- LEAN
        // this.rotation.y = this.vel.x * 4;
        // leanOrigin = this.rotation.y >  1 ? '100% 50%' : leanOrigin;
        // leanOrigin = this.rotation.y < -1 ? '0% 50%' : leanOrigin;
        // this.el.style.transformOrigin = leanOrigin;
      }
      return this;
    };

    this.turnWheels = function (angle) {
      var rad = (angle / this.maxRotation * Math.PI) - Math.PI*0.5;
      var tireRotation = Math.cos(rad) * this.maxRotation;

      this.wheels.fl.el.style.transform = 'rotateY(90deg) translateX(-16px) rotateX(' + tireRotation + 'deg)';
      this.wheels.fr.el.style.transform = 'rotateY(90deg) translateX(-16px) rotateX(' + tireRotation + 'deg)';
      return this;
    };

    return this;
  }

  /*
   *  CONTROLLER
   */

  function PlayerController (player) {

    var _body = document.body,
        _player = player,
        _isRight = false,
        _isLeft = false;

    _body.on('keydown', onKeyDown);
    _body.on('keyup', onKeyUp);

    function onKeyDown (e) {
      var handler = {
        37: onLeftDown,
        39: onRightDown,
        65: onLeftDown,
        68: onRightDown
      };
      if (handler[e.keyCode]) handler[e.keyCode]();
    }

    function onKeyUp (e) {
      var handler = {
        37: onLeftUp,
        39: onRightUp,
        65: onLeftUp,
        68: onRightUp
      };
      if (handler[e.keyCode]) handler[e.keyCode]();
    }

    function onLeftDown () {
      _isLeft = true;
    }
    function onRightDown () {
      _isRight = true;
    }
    function onLeftUp () {
      _isLeft = false;
    }
    function onRightUp () {
      _isRight = false;
    }

    return {
      isLeft: _isLeft,
      isRight: _isRight,
      update: function () {
        var angle = 0,
          wheelAngle;

        if (_isLeft) {
          angle = -_player.responsiveness;
        } else if (_isRight) {
          angle = _player.responsiveness;
        } else {
          _player.rotation.z *= _player.straighteningRate;
        }

        _player.rotation.z += angle;

        wheelAngle = _isLeft && _player.rotation.z < 0 || _isRight && _player.rotation.z > 0 ? -_player.rotation.z : _player.rotation.z * 0.15;
        // wheelAngle = _player.rotation.z * -0.5;
      }
    };
  }


  /*
   *  LEVEL
   */

  function Level () {
    Templatable(this, 'level');
    Collectable(this,'children');
    Positionable(this);
    Rotatable(this);
    Renderable(this);

    this.width = 700;
    this.height = 6000;
    this.rotation.x = 0;
    this.pos.y = 0;

    this.el.style.width = this.width + 'px';
    this.el.style.height = this.height + 'px';

    this.road = {
      el: this.el.getElementsByClassName('road')[0]
    };
    Positionable(this.road);



    this.update = function () {
      var levelSpeed = _player.speed - Math.abs(_player.vel.x);
      this.road.pos.y -= levelSpeed;
      this.road.pos.y = this.road.pos.y < -100 ? this.road.pos.y%100 : this.road.pos.y;
      this.road.el.style.transform = 'translateY(' + -this.road.pos.y + 'px) translateZ(0px)';
      return this;
    };

    return this;
  }

  return {
    start: function () {
      log('game:start');
      if (!this.hasStarted) {
        _startTime = time();
        initObjects();
      }
      this.step();
      this.hasStarted = true;
    },
    stop: function () {
      log('game:stop');
      cancelAnimationFrame(this.requestId);
      _stopTime = time();
    },
    step: function (timestamp) {
      var progress;
      if (_startTime === null) _startTime = timestamp;
      progress = timestamp - _startTime;
      this.requestId = requestAnimationFrame(this.step.bind(this));
      onStep();
    }
  };


  /*
   *  DECORATORS
   */

  function Templatable (o,templateName) {
    o.el = document.createElement('div');
    o.el.classList.add(templateName);
    o.el.appendChild(_templates[templateName].content.cloneNode(true));
  }

  function Collectable (o,type) {
    if (!o.collections) o.collections = {};
    o.collections[type] = [];
    o.add = function (n,type) {
      try {
        o.collections[type].push(n);
        if (n.render) {
          o.el.appendChild(n.el);
        }
      } catch (e) {
        throw new Error('Cannot add \'undefined\' to collection ' + 'to ' + type);
      }
      return o;
    };
    o.remove = function (n,type) {
      log('remove');
      var item;
      for (var i in o.collections[type]) {
        log(o.collections[type][i], n);
        item = o.collections[type][i];
        if (item == n) {
          if (item.render) {
            item.el.parentNode.removeChild(item.el);
          }
          o.collections[type] = o.collections[type].splice(1,i);
        }
      }
    };
  }

  function Positionable (o) {
    o.pos = {
      x: 0,
      y: 0,
      z: 0
    };
    o.moveTo = function (x,y,z) {
      o.pos.x = x || o.pos.x;
      o.pos.y = y || o.pos.y;
      o.pos.z = z || o.pos.z;
      return o;
    };
  }

  function Physicsable (o,minVel,maxVel) {
    o.minVel = minVel || -250;
    o.maxVel = maxVel || 250;

    o.friction = 0.9;

    o.vel = {
      x: 0,
      y: 0,
      z: 0
    };
    o.setVelocity = function (x,y,z) {
      o.vel.x = x || o.pos.x;
      o.vel.y = y || o.pos.y;
      o.vel.z = z || o.pos.z;
      return o;
    };
  }

  function Scalable (o) {
    o.scale = {
      x: 1,
      y: 1,
      z: 1
    };
    o.scaleTo = function (x,y,z) {
      o.scale.x = x || o.scale.x;
      o.scale.y = y || o.scale.y;
      o.scale.z = z || o.scale.z;
      return o;
    };
  }

  function Rotatable (o) {
    o.rotation = {
      x: 0,
      y: 0,
      z: 0
    };
    o.rotateTo = function (x,y,z) {
      o.rotation.x = x || o.rotation.x;
      o.rotation.y = y || o.rotation.y;
      o.rotation.z = z || o.rotation.z;
      return o;
    };
  }

  function Renderable (o) {
    o.update = function () {
      return o;
    };
    o.render = function () {
      var s = {
            x: o.scale? o.scale.x : 1,
            y: o.scale? o.scale.y : 1,
            z: o.scale? o.scale.z : 1
          },
          p = {
            x: o.pos.x,
            y: o.pos.y,
            z: o.pos.z,
          },
          r = {
            x: o.rotation.x,
            y: o.rotation.y,
            z: o.rotation.z,
          };

      // o.el.style.transform = 'matrix3d(' +
      //                         s.x + ',0,0,0,' +
      //                        '0,' + s.y + ',0,0,' +
      //                        '0,0,' + s.z + ',0,' +
      //                        p.x + ',' + p.y + ',' + p.z + ',1)';




      o.el.style.transform = 'translateX(' + p.x + 'px) ' +
                              'translateY(' + p.y + 'px) ' +
                              'translateZ(' + p.z + 'px) ' +
                              'scaleX(' + s.x + ') ' +
                              'scaleY(' + s.y + ') ' +
                              'scaleZ(' + s.z + ') ' +
                              'rotateX(' + r.x + 'deg) ' +
                              'rotateY(' + r.y + 'deg) ' +
                              'rotateZ(' + r.z + 'deg) ' +
                              '';


      return o;
    };
  }



  /*
   *  UTILS
   */

  function time() {
    return new Date().getTime();
  }

  function deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  function rad2deg(rad) {
    return rad * (180/Math.PI);
  }

  function log() {
    var args = Array.prototype.slice.call(arguments);
    console.log.apply(console,args);
  }
})();
