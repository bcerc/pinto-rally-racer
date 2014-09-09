Element.prototype.on = Element.prototype.addEventListener;
Element.prototype.off = Element.prototype.removeEventListener;
window.$ = function (q) { return document.querySelector(q); };
window.toInt = window.parseInt;
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame;
window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.oCancelAnimationFrame;
window.Matrix = window.WebKitCSSMatrix || window.MSCSSMatrix || window.CSSMatrix;
window.PI = Math.PI;

var game = (function(){
  var _container = $('.game-container'),
      _canvas = $('#game-canvas'),
      _scene = $('#game-scene'),
      _templates = {
        car: $('#car-template'),
        level: $('#level-template'),
        wheel: $('#wheel-template'),
        cone: $('#cone-template'),
        pintoSide: $('#pinto-side-template')
      },
      _views = {
        title: $('.title-view')
      },
      _cameraPerspective = 500,
      _startTime = null,
      _playerYOffset = 0.45,
      _hasInit = false,
      _isPaused = true,
      _numOfCones = 12,
      _player,
      _playerShadow,
      _level,
      _playerController,
      _sceneResizeTimeout,
      _cones;

  console.log('_container',_container);
  function init () {
    _hasInit = true;
    _player = new Car();
    _playerShadow = new Shadow(
      'car-shadow',
      _player,
      { padding: 3 });

    _level = new Level();
    _playerController = new PlayerController(_player);


    createCones();

    _views.title.classList.add('bounceInDown');

    delay(function () {
      _views.title.classList.add('bounceOutUp');
      _views.title.classList.remove('bounceInDown');
    },3000,this);

    // $('#yourElement').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', doSomething);


    _level.add(_player,'children');
    _level.add(_playerShadow,'children');
    _scene.appendChild(_level.el);

    updateScene();

    window.onresize = onSceneResize;

    window.player = _player;
    window.playerShadow = _playerShadow;
    window.level = _level;
  }

  function createCones () {
    var cone;
    _cones = [];

    while (_cones.length < _numOfCones - 1) {
      cone = new Cone();
      cone.setRandomColor();
      cone.pos.x = rand(50, _level.width - 50);
      cone.pos.y = rand(50, _level.height - 50);
      _level.add(cone,'children');
      _cones.push(cone);
    }
  }

  function onSceneResize () {
    clearTimeout( _sceneResizeTimeout );
    _sceneResizeTimeout = setTimeout(function () { updateScene(); }, 300);
  }

  function updateScene () {
    var sceneXOffset = _container.clientWidth * 0.5 - _level.width * 0.5,
      sceneYOffset = (_container.clientHeight * 1.3) - _level.height,
      sceneZOffset = -_container.clientHeight * 0.36;

    _player.pos.y = _level.height - (_playerYOffset * _container.clientHeight);
    _scene.style.transform = 'rotateX(75deg) rotateZ(0deg) translateX(' + sceneXOffset + 'px) translateY(' + sceneYOffset + 'px) translateZ(' + sceneZOffset + 'px)';
  }


  function onStep () {
    _playerController.update();

    _player
      .update()
      .render();

    _playerShadow
      .update()
      .render();

    _level
      .update()
      .render();

    _cones.forEach(function (cone, index) {
      cone
        .update()
        .render();
    });

    if (_cameraPerspective >= 1200) {
      _cameraPerspective = 1200;
    } else {
      _cameraPerspective += 6;
    }
    _canvas.style.perspective = _cameraPerspective + 'px';

  }

  function Cone (color) {
    Templatable(this, 'cone');
    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);
    Physicsable(this);
    this.pos.z = 1;
    this.colors = ['red','blue','gold','green'];
    this.coneAnimate = this.el.querySelector('.cone-animate');

    this.setRandomColor = function () {
      var color = this.colors[Math.floor(rand(0,4))];
      this.el.className = 'cone';
      this.el.classList.add('cone-' + color);
    };

    this.update = function () {
      // this.rotation.z += 1;
      // this.rotation.x = 90;
      var isHitX = this.pos.x > _player.pos.x - 5 && this.pos.x < _player.pos.x + 45,
          isHitY = this.pos.y + 30 < _player.pos.y && this.pos.y + 60 > _player.pos.y,
          isHit = isHitX && isHitY;

      if (isHit) {
        if (!this.el.classList.contains('cone-fall')) {
          this.rotation.z = rand(0,40);
        }

        this.el.classList.add('cone-fall');
      }
      return this;
    };
  }

  function Shadow (shadowType,target, options) {
    this.target = target;
    this.options = options || this.defaults;

    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);

    this.el = document.createElement('div');
    this.el.classList.add('shadow');
    this.el.classList.add(shadowType);

    this.el.style.width = toInt(this.target.el.style.width) + this.options.padding * 2 + 'px';
    this.el.style.height = toInt(this.target.el.style.height) + this.options.padding * 2 + 'px';

    this.pos.z = 2;

    this.update = function () {
      this.pos.x = this.target.pos.x - this.options.padding;
      this.pos.y = this.target.pos.y - this.options.padding;
      this.rotation.x = this.target.rotation.x;
      // this.rotation.y = this.target.rotation.y;
      this.rotation.z = this.target.rotation.z;

      return this;
    };
    return this;
  }
  Shadow.prototype.defaults = {
    padding: 0
  };

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

    this.bodyL = this.el.querySelector('.body-left');
    this.bodyLT = this.el.querySelector('.body-left-top');
    this.bodyR = this.el.querySelector('.body-right');
    this.bodyRT = this.el.querySelector('.body-right-top');

    this.wheels.fl.el.appendChild(_templates.wheel.content.cloneNode(true));
    this.wheels.fr.el.appendChild(_templates.wheel.content.cloneNode(true));
    this.wheels.rl.el.appendChild(_templates.wheel.content.cloneNode(true));
    this.wheels.rr.el.appendChild(_templates.wheel.content.cloneNode(true));

    this.width = 33;
    this.height = 100;
    this.pos.x = 200;
    this.pos.y = 5700;
    this.pos.z = 2;


    this.speed = 24;
    this.handling = 1;
    this.smoothness = 1;
    this.maxLeanAngle = 8;
    this.leanStartTime = 0;
    this.maxTurnAngle = 30;

    this.el.style.width = this.width + 'px';
    this.el.style.height = this.height + 'px';

    this.update = function () {
      if (this.vel) {

        //--- TURN
        var rz =  this.rotation.z;
        rz = rz >  this.maxTurnAngle ?  this.maxTurnAngle : rz;
        rz = rz < -this.maxTurnAngle ? -this.maxTurnAngle : rz;
        this.rotation.z = rz;


        //--- TURN LEVEL
        _level.pos.x = (-_player.pos.x + _level.width * 0.5) * 0.4;
        // _level.rotation.z = this.rotation.z * -0.02;  // TODO

        // derive vel from turning angle
        this.vel.x = -this.speed * this.rotation.z / 90;
        // increment pos
        this.pos.x -= this.vel.x;
      }
      return this;
    };

    this.turnWheels = function (angle) {
      var rad = (angle / this.maxTurnAngle * PI) - PI*0.5;
      var tireRotation = Math.cos(rad) * this.maxTurnAngle;

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
      e.preventDefault();
      var handler = {
        37: onLeftDown,
        39: onRightDown,
        65: onLeftDown,
        68: onRightDown
      };
      if (handler[e.keyCode]) handler[e.keyCode]();
    }

    function onKeyUp (e) {
      e.preventDefault();
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
          angle = -_player.handling;

          // leaning
          if (_player.rotation.y > -_player.maxLeanAngle) {
            _player.rotation.y -= 1;
          }

        } else if (_isRight) {
          angle = _player.handling;

          // leaning
          if (_player.rotation.y < _player.maxLeanAngle) {
            _player.rotation.y += 1;
          }
        } else {
          _player.rotation.z *= _player.smoothness;

          // leaning return

          if (_player.rotation.y !== 0) {
            _player.rotation.y *= 0.9;

            _player.rotation.y = Math.abs(_player.rotation.y) < 0.1 ? 0 : _player.rotation.y;

          }
        }

        _player.rotation.prevZ = _player.rotation.z;
        _player.rotation.z += angle;
      }
    };
  }


  /*
   *  WHEEL
   */

  function Wheel () {
    Templatable(this, 'wheel');
    Positionable(this);
    Rotatable(this);
    Renderable(this);

    return this;
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

    this.width = 800;
    this.height = 2400;
    this.rotation.x = 0;
    this.pos.y = 0;
    this.gridSize = 160;

    this.el.style.width = this.width + 'px';
    this.el.style.height = this.height + 'px';

    this.road = {
      el: this.el.getElementsByClassName('road')[0]
    };
    Positionable(this.road);


    this.update = function () {
      var levelSpeed = _player.speed - Math.abs(_player.vel.x);
      this.road.pos.y -= levelSpeed;
      this.road.pos.y = this.road.pos.y < -this.gridSize ? this.road.pos.y%this.gridSize : this.road.pos.y;
      this.road.el.style.transform = 'translateY(' + -this.road.pos.y + 'px) translateZ(0px)';


      _cones.forEach(function (cone, index) {
        cone.pos.y += levelSpeed;

        // reset cone position
        if (cone.pos.y > _level.height) {
          cone.pos.y = 50;
          cone.pos.x = rand(0,_level.width-50);
          cone.setRandomColor();
        }
      });


      return this;
    };

    return this;
  }

  return {
    togglePlay: function () {
      return _isPaused? this.start() : this.stop();
    },
    start: function () {
      if (!_hasInit) {
        _startTime = time();
        init();
      }
      if (_isPaused) {
        this.step();
      }
      _isPaused = false;
      _scene.classList.remove('game-paused');
      return this;
    },
    stop: function () {
      cancelAnimationFrame(this.requestId);
      _stopTime = time();
      _scene.classList.add('game-paused');
      _isPaused = true;
      return this;
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

      // o.el.style.transform = new Matrix().rotate(r.x, 0, 0).rotate(0, r.y, 0).rotate(0, 0, r.z).scale(s.x, s.y, s.z).translate(p.x, p.y, p.z)
      o.el.style.transform = 'translate3d(' + p.x + 'px, ' + p.y + 'px, ' + p.z + 'px) ' +
                              'scale3d(' + s.x + ', ' + s.y + ', ' + s.z + ') ' +
                              'rotateX(' + r.x + 'deg) ' +
                              'rotateZ(' + r.z + 'deg) ' +
                              'rotateY(' + r.y + 'deg) ' +
                              '';
      return o;
    };
  }


  /*
   *  UTILS
   */

  function delay (callback, time, context) {
    setTimeout((callback).bind(context),time);
  }
  function Tween (obj) {
    this.obj = obj;
    this.to = function () {
      return this;
    };
  }

  function Ease (easeType) {
    // t: current time, b: start value, c: change In value, d: duration time
    var easing = {
      cubicIn: function (t, b, c, d) {
        return c*(t/=d)*t*t + b;
      },
      cubicOut: function (t, b, c, d) {
        return c*((t=t/d-1)*t*t + 1) + b;
      },
      cubicInOut: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
      }
    };
    return easing[easeType];
  }

  function time() {
    return new Date().getTime();
  }

  function deg2rad (deg) {
    return deg * (PI/180);
  }

  function rad2deg (rad) {
    return rad * (180/PI);
  }
  function rand (min,max) {
    return Math.random() * (max - min) + min;
  }
})();
