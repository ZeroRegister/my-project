window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}

/**
 * 视频对比滑块组件（简化版 - 无控制栏）
 * Video Comparison Slider Component
 */
class VideoComparisonSlider {
  constructor(container) {
    this.container = container;
    this.videoLeft = container.querySelector('.video-left video');
    this.videoRight = container.querySelector('.video-right video');
    this.videoLeftWrapper = container.querySelector('.video-left');
    this.handle = container.querySelector('.video-comparison-handle');
    
    this.isDragging = false;
    this.position = 50;
    this.videosReady = 0;
    this.masterDuration = 0;
    this.leftLoaded = false;
    this.rightLoaded = false;
    this.initialized = false;
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.updatePosition(50);
    
    // 如果视频已经加载完成（缓存），手动触发
    if (this.videoLeft.readyState >= 1) {
      this.onVideoLoaded('left');
    }
    if (this.videoRight.readyState >= 1) {
      this.onVideoLoaded('right');
    }
  }
  
  bindEvents() {
    // 滑块拖拽事件
    this.handle.addEventListener('mousedown', (e) => this.startDrag(e));
    this.handle.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
    
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('touchmove', (e) => this.onDrag(e), { passive: false });
    
    document.addEventListener('mouseup', () => this.endDrag());
    document.addEventListener('touchend', () => this.endDrag());
    
    // 点击容器也可以移动滑块
    this.container.querySelector('.video-comparison-wrapper').addEventListener('click', (e) => {
      if (!this.isDragging) {
        this.moveToPosition(e);
      }
    });
    
    // 视频加载完成
    this.videoLeft.addEventListener('loadedmetadata', () => this.onVideoLoaded('left'));
    this.videoRight.addEventListener('loadedmetadata', () => this.onVideoLoaded('right'));
    
    // 循环播放处理
    this.videoLeft.addEventListener('ended', () => this.restart());
    this.videoRight.addEventListener('ended', () => {
      this.videoRight.currentTime = 0;
      this.videoRight.play();
    });
  }
  
  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;
    this.container.style.cursor = 'ew-resize';
  }
  
  onDrag(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    
    const rect = this.container.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    let position = ((clientX - rect.left) / rect.width) * 100;
    
    position = Math.max(5, Math.min(95, position));
    this.updatePosition(position);
  }
  
  endDrag() {
    this.isDragging = false;
    this.container.style.cursor = '';
  }
  
  moveToPosition(e) {
    const rect = this.container.getBoundingClientRect();
    let position = ((e.clientX - rect.left) / rect.width) * 100;
    position = Math.max(5, Math.min(95, position));
    this.updatePosition(position);
  }
  
  updatePosition(position) {
    this.position = position;
    this.handle.style.left = position + '%';
    this.videoLeftWrapper.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
  }
  
  onVideoLoaded(which) {
    if (which === 'left' && this.leftLoaded) return;
    if (which === 'right' && this.rightLoaded) return;
    
    if (which === 'left') this.leftLoaded = true;
    if (which === 'right') this.rightLoaded = true;
    
    this.videosReady++;
    
    if (this.videosReady >= 2 && !this.initialized) {
      this.initialized = true;
      this.syncVideoDurations();
      this.play();
    }
  }
  
  syncVideoDurations() {
    const leftDuration = this.videoLeft.duration;
    const rightDuration = this.videoRight.duration;
    
    this.masterDuration = Math.max(leftDuration, rightDuration);
    
    if (leftDuration < rightDuration) {
      this.videoLeft.playbackRate = leftDuration / rightDuration;
      this.videoRight.playbackRate = 1;
    } else if (rightDuration < leftDuration) {
      this.videoLeft.playbackRate = 1;
      this.videoRight.playbackRate = rightDuration / leftDuration;
    } else {
      this.videoLeft.playbackRate = 1;
      this.videoRight.playbackRate = 1;
    }
  }
  
  play() {
    const normalizedTime = this.videoLeft.currentTime / this.videoLeft.playbackRate;
    this.videoRight.currentTime = normalizedTime * this.videoRight.playbackRate;
    
    this.videoLeft.play();
    this.videoRight.play();
  }
  
  restart() {
    this.videoLeft.currentTime = 0;
    this.videoRight.currentTime = 0;
    this.play();
  }
}

// 初始化所有视频对比滑块
function initVideoComparisonSliders() {
  const containers = document.querySelectorAll('.video-comparison-container');
  containers.forEach(container => {
    new VideoComparisonSlider(container);
  });
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
    	// Add listener to  event
    	carousels[i].on('before:show', state => {
    		console.log(state);
    	});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    preloadInterpolationImages();

    $('#interpolation-slider').on('input', function(event) {
      setInterpolationImage(this.value);
    });
    setInterpolationImage(0);
    $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

    // 只初始化不带 no-bulma-init 类的滑块
    bulmaSlider.attach('.slider:not(.no-bulma-init)');

    // 初始化视频对比滑块
    initVideoComparisonSliders();

})
