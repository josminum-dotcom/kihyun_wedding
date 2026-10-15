/* ============================================
   Romantic Flower - Mobile Wedding Invitation
   script.js
   ============================================ */

(function () {
  'use strict';

  /* ── Helpers ── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function padZero(n) {
    return String(n).padStart(2, '0');
  }

  // config 값은 사람이 폼에 입력한 글이라 innerHTML 에 넣기 전에 이스케이프한다
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function hide(el) {
    if (el) el.style.display = 'none';
  }

  /* ── Images ── upload.py 가 CONFIG.images 에 장수를 적는다 */
  function imageList(folder) {
    const n = (CONFIG.images && CONFIG.images[folder]) || 0;
    return Array.from({ length: n }, (_, i) => `images/${folder}/${i + 1}.jpg`);
  }

  const galleryImages = imageList('gallery');

  /* 예식 시각 — 보는 사람이 어느 나라에 있든 한국 시간 기준 */
  function weddingStart() {
    return new Date(`${CONFIG.wedding.date}T${CONFIG.wedding.time}:00+09:00`);
  }

  /* ── Prevent Zoom ── */
  function initPreventZoom() {
    // 트랙패드 핀치도 ctrlKey 가 붙은 wheel 로 들어온다
    document.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '_'].includes(e.key)) {
        e.preventDefault();
      }
    });

    document.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
      const now = (new Date()).getTime();
      // 버튼·링크는 빼야 연달아 누를 때 두 번째 탭이 사라지지 않는다 (확대는 CSS touch-action 이 막는다)
      if (now - lastTouchEnd <= 300 && !e.target.closest('button, a')) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    // iOS 사파리는 user-scalable=no 를 무시하고 핀치를 gesture 이벤트로 보낸다
    ['gesturestart', 'gesturechange'].forEach(function (type) {
      document.addEventListener(type, function (e) {
        e.preventDefault();
      }, { passive: false });
    });
  }

  /* ── Meta Tags ── */
  function initMeta() {
    document.title = CONFIG.meta.title;
    const pt = $('#page-title');
    if (pt) pt.textContent = CONFIG.meta.title;
  }

  /* ── Curtain & BGM Autoplay ── */
  function initCurtain() {
    const curtain = $('#curtain');

    if (CONFIG.useCurtain === false) {
      if (curtain) {
        curtain.style.display = 'none';
      }
      initPetals();
      
      document.body.addEventListener('click', function firstClick() {
        if(window.playBGM) window.playBGM();
        document.body.removeEventListener('click', firstClick);
      }, {once: true});

      return;
    }

    const names = $('#curtain-names');
    const btn = $('#curtain-open');
    if (names) {
      // 한글 이름은 본문 글꼴, & 만 필기체 (필기체에는 한글이 없어 아무 글꼴로나 그려졌다)
      names.innerHTML =
        esc(CONFIG.groom.fullName) + '<span class="ampersand">&amp;</span>' + esc(CONFIG.bride.fullName);
    }
    const w = CONFIG.wedding;
    const [y, m, d] = w.date.split('-');
    const [hh, mm] = w.time.split(':').map(Number);
    const day = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(+y, +m - 1, +d).getDay()];
    const dateEl = $('#curtain-date');
    if (dateEl) dateEl.textContent = `${y}. ${m}. ${d}. ${day}  ${hh < 12 ? 'AM' : 'PM'} ${hh % 12 || 12}:${String(mm).padStart(2, '0')}`;
    const venueEl = $('#curtain-venue');
    if (venueEl) venueEl.textContent = `${w.venue} ${w.hall}`.trim();
    // 글꼴이 준비되면 글자를 보여 준다. 느린 회선이면 1.2초 뒤에는 그냥 보여 준다
    const ready = () => curtain.classList.add('is-ready');
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1200))]).then(ready);

    if (btn) {
      btn.addEventListener('click', () => {
        btn.disabled = true; // 연타해도 한 번만
        document.body.classList.add('is-opening');
        curtain.classList.add('is-open');
        document.body.style.overflow = '';
        initPetals();
        initScrollAnimations();
        if (window.playBGM) window.playBGM();
        // 천이 화면 밖에 멈춘 뒤(0.43s + 1.6s) 커튼 층을 치운다
        setTimeout(() => {
          curtain.classList.add('is-hidden');
          document.body.classList.remove('is-opening');
        }, 2200);
      }, { once: true });
    }
    document.body.style.overflow = 'hidden';
  }

  /* ── BGM Control ── */
  function initBGM() {
    const bgm = $('#bgm');
    const btn = $('#btn-bgm');
    if(!bgm || !btn) return;

    const play = () => bgm.play().catch(() => {});
    bgm.addEventListener('play', () => btn.classList.add('is-playing'));
    bgm.addEventListener('pause', () => btn.classList.remove('is-playing'));

    btn.addEventListener('click', () => (bgm.paused ? play() : bgm.pause()));
    window.playBGM = () => { if (bgm.paused) play(); };
  }

  /* ── Hero ── */
  function initHero() {
    const photo = $('#hero-img');
    if (photo) {
      const shown = () => photo.classList.add('is-loaded');
      if (photo.complete && photo.naturalWidth) shown();
      else photo.addEventListener('load', shown, { once: true });
    }
    const names = $('#hero-names');
    if (names) {
      names.innerHTML =
        esc(CONFIG.groom.fullName) +
        ' <span class="ampersand">&amp;</span> ' +
        esc(CONFIG.bride.fullName);
    }

    const w = CONFIG.wedding;
    const [y, m, d] = w.date.split('-');
    const [hh, mm] = w.time.split(':');
    const ampm = +hh < 12 ? '오전' : '오후';
    const h12 = +hh % 12 || 12;

    const dateEl = $('#hero-date');
    if (dateEl) {
      dateEl.textContent = `${y}년 ${+m}월 ${+d}일 ${w.dayOfWeek} ${ampm} ${h12}시${+mm ? ' ' + +mm + '분' : ''}`;
    }

    const venue = $('#hero-venue');
    if (venue) venue.textContent = w.venue;
  }

  /* ── Countdown ── */
  function initCountdown() {
    const target = weddingStart().getTime();

    function update() {
      const now = Date.now();
      let diff = target - now;
      if (diff < 0) diff = 0;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const dEl = $('#cd-days');
      const hEl = $('#cd-hours');
      const mEl = $('#cd-minutes');
      const sEl = $('#cd-seconds');
      if (dEl) dEl.textContent = days;
      if (hEl) hEl.textContent = padZero(hours);
      if (mEl) mEl.textContent = padZero(minutes);
      if (sEl) sEl.textContent = padZero(seconds);
    }

    update();
    setInterval(update, 1000);
  }

  /* ── Greeting ── */
  function initGreeting() {
    const title = $('#greeting-title');
    const text = $('#greeting-text');
    const parents = $('#greeting-parents');

    if (title) title.textContent = CONFIG.greeting.title;
    if (text) text.textContent = CONFIG.greeting.content;

    if (parents) {
      const g = CONFIG.groom;
      const b = CONFIG.bride;

      const makeName = (name, isDeceased) =>
        isDeceased ? `<span class="deceased">${esc(name)}</span>` : esc(name);
      const line = (p, child) => {
        const names = [[p.father, p.fatherDeceased], [p.mother, p.motherDeceased]]
          .filter(([n]) => n)
          .map(([n, dec]) => makeName(n, dec))
          .join(' &middot; ');
        return `
        <p class="parent-line">
          ${names ? `<span class="parent-names">${names}</span>` : ''}<span class="parent-rel">${names ? '의 ' : ''}${child}</span>
          <strong class="parent-child">${esc(p.name)}</strong>
        </p>`;
      };

      parents.innerHTML =
        line(g, '아들') + '<span class="parent-dot">&amp;</span>' + line(b, '딸');
    }
  }

  /* ── Calendar ── */
  function initCalendar() {
    const el = $('#calendar');
    if (!el) return;

    const [y, m, d] = CONFIG.wedding.date.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0).getDate();
    const startDow = first.getDay();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    let html = `<div class="calendar__header">${monthNames[m - 1]} ${y}</div>`;
    html += '<div class="calendar__weekdays">';
    ['일', '월', '화', '수', '목', '금', '토'].forEach((wd) => {
      html += `<span class="calendar__weekday">${wd}</span>`;
    });
    html += '</div><div class="calendar__days">';

    for (let i = 0; i < startDow; i++) {
      html += '<span class="calendar__day is-empty"></span>';
    }
    for (let day = 1; day <= lastDay; day++) {
      const cls = day === d ? ' is-today' : '';
      html += `<span class="calendar__day${cls}">${day}</span>`;
    }
    html += '</div>';
    el.innerHTML = html;

    // 예식은 2시간으로 잡는다. UTC 로 적어야 어느 기기에서나 같은 시각으로 들어간다
    const utc = (dt) => dt.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const startAt = weddingStart();
    const start = utc(startAt);
    const end = utc(new Date(startAt.getTime() + 2 * 60 * 60 * 1000));
    const w = CONFIG.wedding;

    const where = `${w.venue} ${w.hall}`.trim();
    // 안드로이드 Google 캘린더 앱은 이 주소(/calendar/event)를 받으면 앱으로 연다
    const google =
      `https://calendar.google.com/calendar/event?action=TEMPLATE` +
      `&text=${encodeURIComponent(CONFIG.meta.title)}` +
      `&dates=${start}/${end}` +
      `&location=${encodeURIComponent(where + ', ' + w.address)}` +
      `&details=${encodeURIComponent(CONFIG.meta.description)}`;

    const gBtn = $('#btn-google-cal');
    if (gBtn) gBtn.href = google;

    // 아이폰·맥·PC 는 upload.py 가 만든 wedding.ics 를 열면 기본 캘린더가 추가 창을 띄운다.
    // 안드로이드는 .ics 를 못 여는 캘린더가 많아, 기본 캘린더 앱의 '일정 추가' 화면을 바로 연다
    const iBtn = $('#btn-ics-cal');
    if (iBtn && /Android/i.test(navigator.userAgent)) {
      const e = encodeURIComponent;
      iBtn.href =
        'intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/event;' +
        `l.beginTime=${startAt.getTime()};l.endTime=${startAt.getTime() + 2 * 60 * 60 * 1000};` +
        `S.title=${e(CONFIG.meta.title)};S.eventLocation=${e(where + ', ' + w.address)};` +
        `S.browser_fallback_url=${e(google)};end`;
    }
  }

  /* ── Story ── */
  function initStory() {
    const title = $('#story-title');
    const text = $('#story-text');
    const container = $('#story-images');
    const storyImages = imageList('story');

    if (!CONFIG.story.content && storyImages.length === 0) {
      hide($('#story'));
      return;
    }
    if (title) title.textContent = CONFIG.story.title;
    if (text) text.textContent = CONFIG.story.content;
    if (!container) return;

    container.innerHTML = storyImages
      .map(
        (src) => `
        <div class="story__img-card anim-scale-target">
          <img src="${src}" alt="우리의 이야기" loading="lazy" decoding="async" />
        </div>
      `
      )
      .join('');
  }

  /* ── Gallery ── */
  function initGallery() {
    const grid = $('#gallery-grid');
    if (!grid) return;

    if (galleryImages.length === 0) {
      hide($('#gallery'));
      return;
    }

    // 격자에는 작은 썸네일, 크게 볼 때만 원본을 받는다
    grid.innerHTML = galleryImages
      .map(
        (src, i) => `
      <div class="gallery__item" data-index="${i}">
        <img src="${src.replace('/gallery/', '/gallery/thumb/')}" alt="갤러리 사진 ${i + 1}" loading="lazy" decoding="async" />
      </div>
    `
      )
      .join('');

    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.gallery__item');
      if (item) {
        openViewer(+item.dataset.index);
      }
    });
  }

  /* ── Photo Viewer ── */
  let viewerIdx = 0;
  let touchStartX = 0;
  let touchDeltaX = 0;
  let isSwiping = false;

  function openViewer(index) {
    viewerIdx = index;
    const viewer = $('#viewer');
    const track = $('#viewer-track');
    if (!viewer || !track || galleryImages.length === 0) return;

    track.innerHTML = galleryImages
      .map(
        (src) => `
      <div class="viewer__slide">
        <img data-src="${src}" alt="갤러리 사진" />
      </div>
    `
      )
      .join('');

    viewer.classList.add('is-active');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    goToSlide(viewerIdx, false);
  }

  function closeViewer() {
    const viewer = $('#viewer');
    if (!viewer) return;
    viewer.classList.remove('is-active');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function goToSlide(idx, animate = true) {
    const track = $('#viewer-track');
    const counter = $('#viewer-counter');
    const total = galleryImages.length;
    if (total === 0) return;
    if (idx < 0) idx = 0;
    if (idx >= total) idx = total - 1;
    viewerIdx = idx;

    if (track) {
      track.style.transition = animate ? 'transform 0.3s ease' : 'none';
      track.style.transform = `translateX(-${idx * 100}%)`;
    }
    if (counter) {
      counter.textContent = `${idx + 1} / ${total}`;
    }
    $$('.viewer__slide img', track).slice(Math.max(0, idx - 1), idx + 2).forEach((img) => {
      if (!img.src) img.src = img.dataset.src;
    });
  }

  function initViewer() {
    const viewer = $('#viewer');
    if (!viewer) return;

    $('#viewer-close')?.addEventListener('click', closeViewer);
    viewer.querySelector('.viewer__backdrop')?.addEventListener('click', closeViewer);
    $('#viewer-prev')?.addEventListener('click', () => goToSlide(viewerIdx - 1));
    $('#viewer-next')?.addEventListener('click', () => goToSlide(viewerIdx + 1));

    document.addEventListener('keydown', (e) => {
      if (!viewer.classList.contains('is-active')) return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') goToSlide(viewerIdx - 1);
      if (e.key === 'ArrowRight') goToSlide(viewerIdx + 1);
    });

    const track = $('#viewer-track');
    if (!track) return;

    track.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchDeltaX = 0;
      isSwiping = true;
      track.style.transition = 'none';
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      touchDeltaX = e.touches[0].clientX - touchStartX;
      const percentX = (touchDeltaX / window.innerWidth) * 100;
      const offset = -(viewerIdx * 100) + percentX;
      track.style.transform = `translateX(${offset}%)`;
    }, { passive: true });

    track.addEventListener('touchend', () => {
      if (!isSwiping) return;
      isSwiping = false;
      const threshold = window.innerWidth * 0.2;
      if (touchDeltaX < -threshold) {
        goToSlide(viewerIdx + 1);
      } else if (touchDeltaX > threshold) {
        goToSlide(viewerIdx - 1);
      } else {
        goToSlide(viewerIdx);
      }
    });
  }

  /* ── Location ── */
  function initLocation() {
    const w = CONFIG.wedding;
    const venue = $('#loc-venue');
    const hall = $('#loc-hall');
    const addr = $('#loc-address');
    const tel = $('#loc-tel');
    const mapImg = $('#loc-map-img');

    if (venue) venue.textContent = w.venue;
    if (hall) hall.textContent = w.hall;
    if (addr) addr.textContent = w.address;
    if (tel) {
      if (w.tel) tel.innerHTML = `Tel. <a href="tel:${esc(w.tel.replace(/[^0-9+]/g, ''))}">${esc(w.tel)}</a>`;
      else hide(tel);
    }

    if (mapImg) {
      if (imageList('location').length) mapImg.src = 'images/location/1.jpg';
      else hide(mapImg.closest('.location__map-wrap'));
    }

    const kakao = $('#btn-kakao-map');
    const naver = $('#btn-naver-map');
    if (kakao) w.mapLinks.kakao ? (kakao.href = w.mapLinks.kakao) : hide(kakao);
    if (naver) w.mapLinks.naver ? (naver.href = w.mapLinks.naver) : hide(naver);
    // 지도 링크가 하나뿐이면 반칸이 아니라 한 줄을 다 쓴다
    const maps = [kakao, naver].filter((b) => b && b.style.display !== 'none');
    if (maps.length === 1) maps[0].style.gridColumn = '1 / -1';
    if (!maps.length) hide($('.location__buttons'));

    const copyBtn = $('#btn-copy-address');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        copyToClipboard(w.address, '주소가 복사되었습니다');
      });
    }
  }

  /* ── Account ── */
  function initAccount() {
    const groomBody = $('#acc-groom-body');
    const brideBody = $('#acc-bride-body');

    const { groom, bride } = CONFIG.accounts;
    if (!groom.length && !bride.length) hide($('#account'));
    if (groomBody) groom.length ? (groomBody.innerHTML = renderAccounts(groom)) : hide($('#acc-groom'));
    if (brideBody) bride.length ? (brideBody.innerHTML = renderAccounts(bride)) : hide($('#acc-bride'));

    $$('.accordion__toggle').forEach((btn) => {
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', () => {
        const open = btn.closest('.accordion').classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.account-item__copy');
      if (copyBtn) {
        const account = copyBtn.dataset.account;
        copyToClipboard(account, '계좌번호가 복사되었습니다');
      }
    });
  }

  function renderAccounts(accounts) {
    return accounts
      .map(
        (acc) => `
      <div class="account-item">
        <div class="account-item__info">
          <p class="account-item__role">${esc(acc.role)}</p>
          <p class="account-item__detail">
            <span class="account-item__name">${esc(acc.name)}</span>
            ${esc(acc.bank)} ${esc(acc.number)}
          </p>
        </div>
        <button class="account-item__copy" data-account="${esc(acc.bank)} ${esc(acc.number)} ${esc(acc.name)}">복사</button>
      </div>
    `
      )
      .join('');
  }

  /* ── Share ── */
  // 카카오 JavaScript 키는 원래 브라우저에 공개되는 값이다.
  // 남이 못 쓰게 막는 건 카카오 개발자 콘솔의 '사이트 도메인' 등록이 한다
  const KAKAO_SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js';
  const KAKAO_SRI = 'sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy';

  function loadKakao() {
    if (!CONFIG.kakaoKey) return Promise.reject();
    if (window.Kakao) return Promise.resolve(window.Kakao);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = KAKAO_SDK;
      s.integrity = KAKAO_SRI;
      s.crossOrigin = 'anonymous';
      s.onload = () => {
        if (!Kakao.isInitialized()) Kakao.init(CONFIG.kakaoKey);
        resolve(Kakao);
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function initShare() {
    const base = (CONFIG.siteUrl || window.location.href).split(/[?#]/)[0];
    // 보내는 주소에 올린 버전 번호를 붙인다. 내용을 고치면 번호가 바뀌어
    // 카톡 미리보기와 받는 사람 폰의 캐시가 예전 내용을 보여 주지 않는다
    const url = CONFIG.ogVersion ? `${base}?v=${CONFIG.ogVersion}` : base;
    const text = `${CONFIG.meta.title}\n${CONFIG.meta.description}\n${url}`;

    // 키가 없거나 SDK 를 못 불러오면 폰 공유창, 그것도 없으면 주소 복사
    const fallback = () => {
      if (navigator.share) {
        navigator.share({ title: CONFIG.meta.title, text: CONFIG.meta.description, url }).catch(() => {});
      } else {
        copyToClipboard(text, '청첩장 내용과 주소가 복사되었습니다');
      }
    };

    $('#btn-kakao-share')?.addEventListener('click', () => {
      loadKakao()
        .then((K) => K.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: CONFIG.meta.title,
            description: CONFIG.meta.description,
            imageUrl: base + 'images/og/share.jpg?v=' + (CONFIG.ogVersion || ''),
            imageWidth: CONFIG.shareImageSize[0],
            imageHeight: CONFIG.shareImageSize[1],
            link: { mobileWebUrl: url, webUrl: url },
          },
          buttons: [{ title: '청첩장 보기', link: { mobileWebUrl: url, webUrl: url } }],
        }))
        .catch(fallback);
    });

    // 아이폰은 sms:&body=, 안드로이드는 sms:?body= 를 알아듣는다
    const sms = $('#btn-sms-share');
    if (sms && !/Android|iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)) {
      hide(sms);
      $('#btn-link-share').style.gridColumn = '1 / -1';
    }
    else if (sms) {
      const sep = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? '&' : '?';
      sms.href = `sms:${sep}body=${encodeURIComponent(text)}`;
    }

    // 카톡·문자와 같은 내용(제목·날짜·장소·주소)을 복사해 어디에 붙여 넣어도 무슨 링크인지 보이게
    $('#btn-link-share')?.addEventListener('click', () => {
      copyToClipboard(text, '청첩장 내용과 주소가 복사되었습니다');
    });
  }

  /* ── Toast ── */
  let toastTimer = null;
  function showToast(msg) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2200);
  }

  /* ── Clipboard ── */
  function copyToClipboard(text, toastMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(toastMsg);
      }).catch(() => {
        fallbackCopy(text, toastMsg);
      });
    } else {
      fallbackCopy(text, toastMsg);
    }
  }

  function fallbackCopy(text, toastMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(toastMsg);
    } catch (e) {
      showToast('복사에 실패했습니다');
    }
    document.body.removeChild(ta);
  }

  /* ── Scroll Animations ── */
  let scrollObserver = null;

  function initScrollAnimations() {
    if (scrollObserver) return;
    const targets = $$('.anim-target, .gallery__item, .story__img-card');
    if (!targets.length) return;

    scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            scrollObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el) => scrollObserver.observe(el));
  }


  /* ── Falling Petals ── */
  function initPetals() {
    const canvas = $('#petals-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    const petals = [];
    const PETAL_COUNT = 25;

    const petalColors = [
      'rgba(183, 110, 121, 0.5)',
      'rgba(212, 160, 168, 0.45)',
      'rgba(245, 190, 195, 0.4)',
      'rgba(240, 180, 170, 0.35)',
      'rgba(200, 140, 150, 0.4)',
    ];

    function resize() {
      const h = Math.max(H || 0, window.innerHeight);
      if (window.innerWidth === W && h === H) return;
      W = canvas.width = window.innerWidth;
      H = canvas.height = h;
    }

    function createPetal() {
      return {
        x: Math.random() * W,
        y: -20 - Math.random() * H * 0.3,
        size: 6 + Math.random() * 10,
        speedY: 0.4 + Math.random() * 0.8,
        speedX: -0.3 + Math.random() * 0.6,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.02,
        color: petalColors[Math.floor(Math.random() * petalColors.length)],
        opacity: 0.3 + Math.random() * 0.4,
      };
    }

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      const s = p.size;
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(s * 0.3, -s * 0.4, s * 0.8, -s * 0.3, s * 0.5, 0);
      ctx.bezierCurveTo(s * 0.8, s * 0.3, s * 0.3, s * 0.4, 0, 0);
      ctx.fill();

      ctx.restore();
    }

    function animate() {
      ctx.clearRect(0, 0, W, H);
      petals.forEach((p) => {
        p.wobble += p.wobbleSpeed;
        p.x += p.speedX + Math.sin(p.wobble) * 0.5;
        p.y += p.speedY;
        p.rotation += p.rotSpeed;

        if (p.y > H + 20) {
          p.y = -20;
          p.x = Math.random() * W;
        }
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;

        drawPetal(p);
      });
      requestAnimationFrame(animate);
    }

    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < PETAL_COUNT; i++) {
      petals.push(createPetal());
    }
    animate();
  }

  /* ── Footer ── */
  function initCredit() {
    const footer = $('.footer');
    if (!footer || !CONFIG.musicCredit) return;
    const p = document.createElement('p');
    p.className = 'footer__credit';
    p.textContent = CONFIG.musicCredit;
    footer.appendChild(p);
  }

  /* ── Init ── */
  function init() {
    // 새로고침·뒤로가기 때 브라우저가 이전 스크롤 위치로 데려가지 않게. 청첩장은 늘 첫 화면부터
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    initPreventZoom();
    initMeta();
    initCurtain();
    initBGM();
    initHero();
    initCountdown();
    initGreeting();
    initCalendar();
    initViewer();
    initLocation();
    initAccount();
    initShare();
    initStory();
    initGallery();
    initCredit();
    if (CONFIG.useCurtain === false) initScrollAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
