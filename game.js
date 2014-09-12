Element.prototype.on = Element.prototype.addEventListener;
Element.prototype.off = Element.prototype.removeEventListener;
Element.prototype.index = function (child) {
  for(var i=0; i<this.children.length; i++) {
    if (child==this.children[i]) return i;
  }
};
EventTarget.prototype.trigger = EventTarget.prototype.dispatchEvent;
window.$ = function (q) { return document.querySelector(q); };
window.toInt = window.parseInt;
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame;
window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.oCancelAnimationFrame;
window.Matrix = window.WebKitCSSMatrix || window.MSCSSMatrix || window.CSSMatrix;
window.PI = Math.PI;
window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
window.body = document.body;

var game = (function(){
  var _container = $('.game-container'),
      _canvas = $('#game-canvas'),
      _camera = new Camera($('#game-camera')),
      _templates = {
        car: $('#car-template'),
        level: $('#level-template'),
        wheel: $('#wheel-template'),
        cone: $('#cone-template'),
        pintoSide: $('#pinto-side-template')
      },
      _cameraPerspective = 500,
      _hasInit = false,
      _isPaused = true,
      _totalConesHit = 0,
      _requestId,
      _player,
      _playerShadow,
      _level,
      _playerController,
      _cameraResizeTimeout;


  var _levels = [
      {
        name: 'Training',
        numOfCones: 0,
        speed: 18,
        topColor: '#757F9A',
        botColor: '#D7DDE8'
      },{
        name: 'Paradise',
        numOfCones: 6,
        speed: 18,
        topColor: '#1D2B64',
        botColor: '#F8CDDA'
      },{
        name: 'Sea Weed',
        numOfCones: 8,
        speed: 18,
        topColor: '#4CB8C4',
        botColor: '#3CD3AD'
      },{
        name: 'Mirage',
        numOfCones: 10,
        speed: 18,
        topColor: '#16222A',
        botColor: '#3A6073'
      },{
        name: 'Steel Gray',
        numOfCones: 12,
        speed: 18,
        topColor: '#1F1C2C',
        botColor: '#928DAB'
      },{
        name: 'Venice Blue',
        numOfCones: 14,
        speed: 18,
        topColor: '#085078',
        botColor: '#85D8CE'
      },{
        name: 'Moss',
        numOfCones: 16,
        speed: 18,
        topColor: '#134E5E',
        botColor: '#71B280'
      },{
        name: 'Influenza',
        numOfCones: 18,
        speed: 18,
        topColor: '#C04848',
        botColor: '#480048'
      }
    ];

  function init () {
    _hasInit = true;
    _player = new Car();
    _playerShadow = new Shadow(
      'car-shadow',
      _player,
      { padding: 3 });

    _level            = new Level(_levels[0]);
    _playerController = new PlayerController(_player);

    $('.title-view').classList.add('animated','bounceInDown');

    _level.add(_player,'children');
    _level.add(_playerShadow,'children');
    _camera.el.appendChild(_level.el);

    updateScene();

    body.on('hit-cone', function () {
      _totalConesHit++;
      $('.combo-meter-fill').style.width = _totalConesHit + '%';
      Sound('cone_hit',_totalConesHit);
    });


    // init level buttons
    var lvlData,
        lvlBtn;

    for (var i=0; i < _levels.length; i++) {
      lvlData = _levels[i];
      lvlBtn = document.createElement('button');
      lvlBtn.innerText = lvlData.name;
      lvlBtn.style.backgroundImage = linearGradient(lvlData.topColor,lvlData.botColor);
      $('.levels').appendChild(lvlBtn);
    }
    $('.levels').on('click', function (e) {
      var index = e.currentTarget.index(e.target);
      for(var i=0; i<e.currentTarget.children.length; i++) {
        e.currentTarget.children[i].classList.remove('active');
      }
      e.target.classList.add('active');
      game.show('gameplay',index);
    });
    // end init level buttons

    window.onresize = onSceneResize;
    window.player = _player;
    window.playerShadow = _playerShadow;
    window.level = _level;
    window.camera = _camera;
  }


  function onSceneResize () {
    clearTimeout( _cameraResizeTimeout );
    _cameraResizeTimeout = setTimeout(function () { updateScene(); }, 300);
  }

  function updateScene () {
    _camera.render();

    _player.pos.y = _level.height - 200;
    _level.offsetZ = -_container.clientHeight * 0.36;
    _level.pos.y =  - _player.pos.y - _player.height * 0.5;
    _level.render();
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

    _camera
      .update()
      .render();

    for (var i = _level.cones.length - 1; i >= 0; --i) {
      _level.cones[i]
        .update()
        .render();
    }

    if (_cameraPerspective >= 1200) {
      _cameraPerspective = 1200;
    } else {
      _cameraPerspective += 6;
    }
    _canvas.style.perspective = _cameraPerspective + 'px';

  }

  function Camera (el) {
    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);
    this.el = el;

    this.pos.x = 0;
    this.pos.y = -170;
    this.pos.z = 600;
    this.rotation.x = 75;
    this.rotation.y = 0;
    this.rotation.z = 0;
    this.has360View = true;

    this.set360View = function (n, speed) {
      this.has360View = n;
      this.viewRotateSpeed = speed;
      if (!n) {
        _camera.rotation.z %= 360;
        if (_camera.rotation.z > 180) {
          _camera.rotation.z %= 180;
          _camera.rotation.z = 180 - _camera.rotation.z;
        }
      }
      return this;
    };

    this.update = function () {
      if (this.has360View) {
        // rate of 360 spin
        this.rotation.z += 0.25;
      } else {
        // rate of return to normal view
        this.rotation.z *= 0.97;

        if (this.rotation.z !== 0) {
          this.rotation.z = Math.abs(this.rotation.z) > 0.001 ? this.rotation.z : 0;
        }
      }
      return this;
    };
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
    this.coneAnimate.classList.add('fall'+(Math.ceil(rand(0,3))));

    this.setRandomColor = function () {
      var color = this.colors[Math.floor(rand(0,4))];
      this.setColor(color);
    };

    this.setColor = function (color) {
      this.el.className = 'cone';
      this.el.classList.add('cone-' + color);
    };

    this.update = function () {
      var isHitX = this.pos.x > _player.pos.x - 5 && this.pos.x < _player.pos.x + 45,
          isHitY = this.pos.y + 30 < _player.pos.y && this.pos.y + 60 > _player.pos.y,
          isHit = isHitX && isHitY;

      if (isHit) {
        if (!this.el.classList.contains('cone-fall')) {
          this.rotation.z = rand(0,40);
          body.trigger(new CustomEvent('hit-cone'));
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
    this.maxSpeed = 55;
    this.handling = 1;
    this.smoothness = 1;
    this.maxLeanAngle = 20;
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


        // derive vel from turning angle
        this.vel.x = -this.speed * this.rotation.z / 90;
        // increment pos
        this.pos.x -= this.vel.x;
      }
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
      if (!7280%e.keyCode) e.preventDefault();
      var handler = {
        37: onLeftDown,
        39: onRightDown,
        65: onLeftDown,
        68: onRightDown,
        80: game.togglePlay.bind(game)
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
          if (_player.rotation.y > -_player.maxLeanAngle * (_player.speed/_player.maxSpeed)) {
            _player.rotation.y -= 1;
          }

        } else if (_isRight) {
          angle = _player.handling;

          // leaning
          if (_player.rotation.y < _player.maxLeanAngle * (_player.speed/_player.maxSpeed)) {
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
    Scalable(this);
    Renderable(this);

    return this;
  }

  /*
   *  LEVEL
   */

  function Level (options) {
    Templatable(this, 'level');
    Collectable(this,'children');
    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);

    this.width = 604;
    this.height = 2000;
    this.offsetX = 0;
    this.offsetZ = 0;
    this.rotation.x = 0;
    this.pos.y = 0;
    this.gridSize = 160;
    this.cones = [];
    this.conesPassed = 0;
    this.patterns = [
      function (n) {
        n = n%60;
        return 150 * Math.sin(n/20 * PI*2) + _level.width *0.5;
      }
    ];

    this.el.style.width = this.width + 'px';
    this.el.style.height = this.height + 'px';

    this.road = {
      el: this.el.getElementsByClassName('road')[0]
    };
    Positionable(this.road);

    this.setOptions = function (options) {
      this.name = '';
      if (options.numOfCones) this.numOfCones = options.numOfCones;
      if (options.topColor) this.topColor = options.topColor;
      if (options.botColor) this.botColor = options.botColor;
      if (options.speed) _player.speed = options.speed;
      this.createCones();
      this.changeBg(this.topColor, this.botColor);
    };

    this.changeBg = function (topColor, botColor) {
      $('.bg-gradient').style.background = linearGradient(topColor,botColor);
      $('.bg-gradient').classList.add('show');
      delay(function () {
        document.body.style.background = linearGradient(topColor,botColor);
        $('.bg-gradient').classList.remove('show');
      }, 2000, this);
    };

    this.createCones = function () {
      var cone;

      for (var i = 0; i < this.numOfCones; i++) {
        cone = new Cone();
        cone.setRandomColor();
        cone.pos.x = rand(50, this.width - 50);
        // cone.pos.y = rand(50, this.height - 50);
        cone.pos.y = i/this.numOfCones * this.height;

        this.add(cone,'children');
        this.cones.push(cone);
      }
      return this;
    };
    this.destroyCones = function () {
      this.cones.forEach( function (cone, index, cones) {
        cone.el.remove();
      });
      while(this.cones.length > 0) {
        this.cones.pop();
      }
    };
    this.update = function () {
      var levelSpeed = _player.speed - Math.abs(_player.vel.x);
      this.road.pos.y -= levelSpeed;
      this.road.pos.y = this.road.pos.y < -this.gridSize ? this.road.pos.y%this.gridSize : this.road.pos.y;
      this.road.el.style.transform = 'translateY(' + -this.road.pos.y + 'px) translateZ(0px)';

      //--- TURN LEVEL
      this.pos.x = -this.width * 0.5;
      this.pos.z = this.offsetZ;
      this.cones.forEach(function (cone, index) {
        cone.pos.y += levelSpeed;

        // reset cone position
        if (cone.pos.y > _level.height) {
          cone.pos.y = 50;
          // cone.pos.x = rand(0,_level.width-50);
          cone.pos.x = _level.patterns[0](_level.conesPassed);
          cone.rotation.z = 0;
          cone.setRandomColor();
          _level.conesPassed++;
        }
      });
      return this;
    };
    this.setOptions(options);
    return this;
  }


  function step (timestamp) {
    _requestId = requestAnimationFrame(step);
    onStep();
  }

  return {
    togglePlay: function () {
      return _isPaused? this.start() : this.pause();
    },
    start: function () {
      if (!_hasInit) {
        init();
      }
      if (_isPaused) {
        step();
      }
      _isPaused = false;
      _camera.el.classList.remove('game-paused');
      return this;
    },
    pause: function () {
      cancelAnimationFrame(_requestId);
      _stopTime = time();
      _camera.el.classList.add('game-paused');
      _isPaused = true;
      return this;
    },
    setLevel: function (num) {
      _level.setOptions(_levels[num]);
    },
    show: function (view,levelNum) {
      if (view=='level-select') {
        $('.title-view').classList.add('exitOutDown');
        $('.title-view').classList.remove('bounceInDown');
        delay(function(){
          $('.title-view').classList.remove('exitOutDown','animated');
        },1000);
        $('.level-select-view').classList.add('animated', 'bounceInDown');
      }

      if (view=='gameplay') {
        // $('.title-view').classList.add('bounceInDown');
        $('.level-select-view').classList.add('exitOutDown');
        $('.level-select-view').classList.remove('bounceInDown');
        delay(function(){
          $('.level-select-view').classList.remove('exitOutDown','animated');
        },1000);

        if (this.state==='pause') {
          _camera.set360View(false);
          $('.pause-view').classList.add('exitOutDown');
          $('.pause-view').classList.remove('bounceInDown');
          delay(function(){
            $('.pause-view').classList.remove('exitOutDown','animated');
            game.start();
          },1000);
        }

        $('.hud-view').classList.add('animated', 'bounceInDown');

        _camera.set360View(false);
        clearInterval(this.pauseInterval);
        delay(function (){
          this.setLevel(levelNum);
          game.start();
        },1000,this);
      }

      if (view=='pause') {
        _camera.set360View(true);
        this.pauseInterval = setInterval(function () {
          _camera
            .update()
            .render();
        },10);

        $('.hud-view').classList.add('exitOutUp');
        $('.hud-view').classList.remove('bounceInDown');
        delay(function(){
          $('.hud-view').classList.remove('exitOutUp','animated');
        },1000);
        this.pause();
        $('.pause-view').classList.add('animated', 'bounceInDown');
      }
      this.state = view;
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
        x: o.scale.x,
        y: o.scale.y,
        z: o.scale.z
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

  function Sound(type, amt) {
    var C4 = 261.626,
        E4 = 329.628,
        A3 = 220,
        A4 = 440,
        D4 = 293.665,
        F4 = 349.228,
        G3 = 195.998,
        G4 = 391.995,
        B3 = 246.942,
        song  = [C4,C4,E4,E4,A3,A3,C4,C4,D4,D4,F4,F4,G3,G3,B3,B3],
        song2 = [E4,E4,G4,G4,C4,C4,E4,E4,F4,F4,A4,A4,B3,B3,D4,D4],
        songLen = song.length;

    play(song);
    // play(song2);

    function play (song) {
      var osc = audioCtx.createOscillator(),
        gain = audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.value = song[amt%songLen];
      osc.connect(audioCtx.destination);
      osc.start(0);
      window.osc = osc;

      setTimeout(function () {
        osc.stop(0);
      },600);
    }
  }


  function linearGradient (topColor,botColor) {
    return 'linear-gradient(180deg, ' + topColor + ' 0%, ' + botColor + ' 100%)';
  }
  function delay (callback, time, context) {
    context = !context ? this : context;
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
  function randInt (min,max) {
    return Math.floor(rand(min,max));
  }
})();
