document.addEventListener('DOMContentLoaded', function() {
  const hero = document.getElementById('hero');
  const rowsContainer = document.getElementById('rows');
  const searchInput = document.getElementById('q');
  const searchBox = document.getElementById('searchBox');
  const modal = document.getElementById('modal');
  const installBtn = document.getElementById('installBtn');
  const closeBtn = document.getElementById('closeBtn');
  const clockEl = document.getElementById('clock');
  const modalInstalls = document.getElementById('modalInstalls');
  const marqueeText = document.getElementById('marquee-text');

  const PLACEHOLDER_ICON = 'https://placehold.co/320x180/1a2a3a/1a2a3a?text=...';
  const FALLBACK_ICON = 'https://placehold.co/320x180/223344/ffffff?text=No+Image';

  let DATA = [], data = [], allAppsFlat = [];
  let currentRow = 0, currentCol = 0;
  let isDownloading = false;
  let focusSection = 'none';
  let lastFocusedElement = null;
  let lazyLoadObserver;

  function showInlineWarning(element, message) {
    const originalText = element.textContent;
    const originalColor = element.style.color;
    element.textContent = message;
    element.style.color = 'orange';
    element.classList.add('shake');
    setTimeout(function() {
      if (element.textContent === message) {
        element.textContent = originalText;
        element.style.color = originalColor;
      }
      element.classList.remove('shake');
    }, 2500);
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function normalizeText(str) { return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase(); }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function initializeLazyLoading() {
    if (lazyLoadObserver) lazyLoadObserver.disconnect();
    lazyLoadObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.getAttribute('data-src');
          const loader = document.createElement('div');
          loader.className = 'img-loader';
          img.parentElement.style.position = 'relative';
          loader.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:32px;height:32px;border:3px solid rgba(255,255,255,0.3);border-top-color:#00bfff;border-radius:50%;animation:spin 1s linear infinite;`;
          img.parentElement.appendChild(loader);
          img.onload = function() { loader.remove(); img.classList.add('loaded'); };
          img.onerror = function() { loader.remove(); img.src = FALLBACK_ICON; img.classList.add('loaded'); };
          img.src = src || FALLBACK_ICON;
          observer.unobserve(img);
        }
      });
    }, { rootMargin: "0px 0px 200px 0px" });
    document.querySelectorAll('img.lazy').forEach(function(img) { lazyLoadObserver.observe(img); });
  }

  function preloadImagesInBackground() {
    const run = window.requestIdleCallback || function(cb) { setTimeout(cb, 1); };
    let i = 0;
    function preloadNext() {
      if (i >= allAppsFlat.length) return;
      const item = allAppsFlat[i];
      if (item && item.icon) {
        const img = new Image();
        img.src = item.icon;
      }
      i++;
      run(preloadNext);
    }
    run(preloadNext);
  }

  function renderRows() {
    rowsContainer.innerHTML = '';
    data.forEach(function(g, r) {
      const wrap = document.createElement('div');
      wrap.className = 'row-wrap';
      if (g.category === 'NỔI BẬT') wrap.classList.add('row-wrap-featured');
      const t = document.createElement('div');
      t.className = 'row-title';
      t.textContent = g.category;
      wrap.appendChild(t);
      if (g.subtitle) {
        const s = document.createElement('p');
        s.className = 'row-subtitle';
        s.textContent = g.subtitle;
        wrap.appendChild(s);
      }
      const sc = document.createElement('div');
      sc.className = 'scroller';
      g.items.forEach(function(it, i) {
        const c = document.createElement('div');
        c.className = 'card';
        c.dataset.row = r;
        c.dataset.col = i;
        c.tabIndex = -1;
        const metaParts = [];
        if (it.developer && it.developer.trim()) metaParts.push(it.developer.trim());
        if (it.installs && it.installs.trim()) metaParts.push(it.installs.trim());
        const metaText = metaParts.join(' · ');
        c.innerHTML = `<div class='thumb-wrap'><img src="${PLACEHOLDER_ICON}" data-src='${it.icon}' class='thumb lazy'></div><div class='card-title'>${it.name}</div><div class='meta'>${metaText}</div>`;
        c.addEventListener('click', function() { openModal(it); });
        c.addEventListener('touchstart', function() { openModal(it); }, { passive: true });
        sc.appendChild(c);
      });
      wrap.appendChild(sc);
      rowsContainer.appendChild(wrap);
    });
    initializeLazyLoading();
  }

  function updateFocus() {
    document.querySelectorAll('.card.focused, .row-wrap.focused-row').forEach(function(e) { e.classList.remove('focused', 'focused-row'); });
    searchBox.classList.remove('focused');
    if (focusSection === 'topbar') {
      searchBox.classList.add('focused');
      if (document.activeElement && document.activeElement.classList.contains('card')) {
        document.activeElement.blur();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (focusSection === 'rows') {
      const rows = document.querySelectorAll('.row-wrap');
      if (!rows.length) return;
      currentRow = clamp(currentRow, 0, rows.length - 1);
      const r = rows[currentRow];
      r.classList.add('focused-row');
      const cards = r.querySelectorAll('.card');
      currentCol = clamp(currentCol, 0, cards.length - 1);
      const act = cards[currentCol];
      if (act) {
        act.classList.add('focused');
        act.focus();
        r.scrollIntoView({ behavior: 'smooth', block: 'center' });
        act.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }

  function openModal(it) {
    if (!it || !it.name) return;
    lastFocusedElement = document.activeElement;
    modal.classList.add('open');
    document.getElementById('modalIcon').src = it.icon || FALLBACK_ICON;
    document.getElementById('modalTitle').textContent = it.name;
    document.getElementById('modalDev').textContent = it.developer || '';
    document.getElementById('modalDesc').textContent = it.desc || '';
    modalInstalls.textContent = 'Lượt tải: 0';
    const randomVal = Math.floor(Math.random() * 9000) + 1000;
    animateInstalls(modalInstalls, randomVal, 100);
    installBtn.dataset.apkUrl = it.apk_url || '';
    installBtn.dataset.appName = it.name || 'app';
    setTimeout(function() { installBtn.focus(); }, 0);
  }

  function closeModal() {
    modal.classList.remove('open');
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
    if (isDownloading) {
      isDownloading = false;
      if (window.Android && typeof window.Android.stopDownload === 'function') {
        try {
          window.Android.stopDownload();
          modalInstalls.style.color = "orange";
          modalInstalls.textContent = "Đã dừng tải.";
        } catch {}
      }
    }
  }
  closeBtn.addEventListener('click', closeModal);

	installBtn.addEventListener('click', function() {
    if (isDownloading) {
      showInlineWarning(modalInstalls, 'Một ứng dụng khác đang được tải...');
      return;
    }
    
    const url = installBtn.dataset.apkUrl;
    const appName = installBtn.dataset.appName;
    
    if (!url || url === '#') {
      modalInstalls.style.color = "red";
      modalInstalls.textContent = "Lỗi tải: Link không hợp lệ";
      return;
    }

    modalInstalls.style.color = '#00bfff';
    
    // KIỂM TRA MÔI TRƯỜNG
    // Nếu là môi trường Android Box (WebView có inject window.Android)
    if (window.Android && typeof window.Android.downloadAndInstall === 'function') {
      modalInstalls.textContent = 'Đang kiểm tra link...';
      validateFile(url).then(function(check) {
        if (!check.ok) {
          modalInstalls.style.color = "red";
          modalInstalls.textContent = "Lỗi tải: Link không hợp lệ";
          return;
        }
        modalInstalls.style.color = '#00bfff';
        modalInstalls.textContent = 'Đang tải... 0%';
        isDownloading = true;
        try {
          window.Android.downloadAndInstall(url, appName + '.apk');
        } catch (e) {
          modalInstalls.style.color = "red";
          modalInstalls.textContent = "Lỗi tải App";
          isDownloading = false;
        }
      });
    } 
    // Nếu là môi trường Trình duyệt Web thông thường (Máy tính, Điện thoại)
    else {
      modalInstalls.textContent = 'Đang bắt đầu tải...';
      const a = document.createElement('a');
      a.href = url;
      
      // Nếu link không kết thúc bằng .apk thì mới mở tab mới (để tránh mất trang store)
      if (!url.toLowerCase().split('?')[0].endsWith('.apk')) {
          a.target = '_blank'; 
      }
      
      a.download = appName + '.apk'; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      modalInstalls.style.color = "#00bfff";
      modalInstalls.textContent = "Bắt đầu tải ứng dụng!";
      
      // Tự động đóng popup sau 3 giây
      setTimeout(closeModal, 3000);
    }
  });

  function validateFile(url) {
    return fetch(url, { method: 'HEAD' })
      .then(function(res) {
        if (!res.ok) return { ok: false };
        const type = res.headers.get('content-type') || '';
        if (!type.includes('application') && !url.endsWith('.apk')) return { ok: false };
        const finalUrl = res.url || url;
        if (!finalUrl.endsWith('.apk') && !type.includes('application')) return { ok: false };
        return { ok: true };
      })
      .catch(function() {
        return { ok: false };
      });
  }

  window.onDownloadProgress = function (percent) {
    if (modal.classList.contains('open')) {
      if (percent < 0 || percent >= 100) isDownloading = false;
      if (percent < 0) {
        modalInstalls.style.color = "red";
        modalInstalls.textContent = "Lỗi tải";
        return;
      }
      modalInstalls.style.color = "#00bfff";
      modalInstalls.textContent = percent < 100 ? `Đang tải... ${percent}%` : "Tải xong!";
      if (percent >= 100) setTimeout(closeModal, 2000);
    }
  };

  function animateInstalls(targetEl, targetValue, duration) {
    duration = duration || 100;
    let start = 0;
    const totalFrames = Math.round(duration / 16);
    const increment = targetValue / totalFrames;
    function update() {
      start += increment;
      if (start < targetValue) {
        targetEl.textContent = 'Lượt tải: ' + Math.floor(start).toLocaleString();
        requestAnimationFrame(update);
      } else {
        targetEl.textContent = 'Lượt tải: ' + targetValue.toLocaleString();
      }
    }
    requestAnimationFrame(update);
  }

  function handleSearch() {
    const q = normalizeText(searchInput.value.trim());
    if (q === '') {
      document.body.classList.remove('search-active');
      data = DATA.slice();
    } else {
      document.body.classList.add('search-active');
      const results = allAppsFlat.filter(function(app) {
        const name = normalizeText(app.name || '');
        const desc = normalizeText(app.desc || '');
        const dev = normalizeText(app.developer || '');
        return name.includes(q) || desc.includes(q) || dev.includes(q);
      });
      data = [{ category: 'Kết quả tìm kiếm', subtitle: `Có ${results.length} kết quả`, items: results }];
    }
    currentRow = 0;
    currentCol = 0;
    renderRows();
    if (document.activeElement !== searchInput) {
      updateFocus();
    }
  }
  searchInput.addEventListener('input', handleSearch);

  function updateClock() {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    if (clockEl) clockEl.textContent = `${hh}:${mm}`;
  }
  updateClock();
  setInterval(updateClock, 60000);

  function fetchAnnouncement() {
    fetch(`https://raw.githubusercontent.com/concuconcac/codeappdonganhstoretv/refs/heads/main/thongbao/chuchay.json?t=${new Date().getTime()}`)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Không thể tải thông báo');
        }
        return response.json();
      })
      .then(function(announcementData) {
        if (marqueeText && announcementData.message) {
          marqueeText.textContent = announcementData.message;
        }
      })
      .catch(function(error) {
        console.error('Lỗi tải thông báo:', error);
        if (marqueeText) {
          marqueeText.parentElement.parentElement.style.display = 'none';
        }
      });
  }

  function initializeApp() {
    fetch('https://raw.githubusercontent.com/concuconcac/codeappdonganhstoretv/refs/heads/main/danhsachapp/listapp.json')
      .then(function(response) {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(function(json) {
        const parsed = json.map(function(cat) {
          return { category: cat.category, subtitle: cat.subtitle || '', items: Array.isArray(cat.items) ? cat.items : [] };
        });
        allAppsFlat = json.flatMap(function(cat) {
          return cat.items || [];
        });
        shuffleArray(allAppsFlat);
        const featured = { category: 'ỨNG DỤNG NỔI BẬT', subtitle: 'Ứng dụng được đề xuất hôm nay', items: allAppsFlat.slice(0, 8) };
        DATA = [featured].concat(parsed);
        data = DATA.slice();
        renderRows();
        document.body.classList.add('loaded');
        fetchAnnouncement();
        setInterval(fetchAnnouncement, 60000);
        preloadImagesInBackground();
      })
      .catch(function(err) {
        rowsContainer.innerHTML = "<div style='color:red;text-align:center;'>Không có kết nối Internet. Xin vui lòng kiểm tra kết nối Internet...</div>";
        document.body.classList.add('loaded');
      });
  }

  document.addEventListener('keydown', function(e) {
    const key = e.key;
    const isSearching = document.activeElement === searchInput;

    if (isSearching) {
      e.stopPropagation();
      if (key === 'ArrowDown') {
        e.preventDefault();
        focusSection = 'rows';
        searchInput.blur();
        updateFocus();
      } else if (key === 'Enter') {
        e.preventDefault();
        searchInput.blur();
        if (data.length > 0 && data[0].items.length > 0) {
          focusSection = 'rows';
        } else {
          focusSection = 'topbar';
        }
        updateFocus();
      }
      return;
    }

    e.preventDefault();

    if (modal.classList.contains('open')) {
      let focusedBtn = document.activeElement;
      const buttons = [installBtn, closeBtn];
      const currentIndex = buttons.indexOf(focusedBtn);
      let newIndex = currentIndex;
      switch (key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          newIndex = Math.min(buttons.length - 1, currentIndex + 1);
          break;
        case 'Enter':
        case 'OK':
          if (focusedBtn) focusedBtn.click();
          break;
        case 'Back':
        case 'Escape':
          closeModal();
          break;
        default:
          return;
      }
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < buttons.length) {
        buttons[newIndex].focus();
      }
    } else {
      if (focusSection === 'none') {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
          if (key === 'ArrowUp') {
            focusSection = 'topbar';
          } else {
            focusSection = 'rows';
          }
          updateFocus();
        }
        return;
      }
      if (focusSection === 'topbar') {
        switch (key) {
          case 'ArrowDown':
            focusSection = 'rows';
            updateFocus();
            break;
          case 'Enter':
          case 'OK':
            searchInput.focus();
            break;
        }
      } else if (focusSection === 'rows') {
        switch (key) {
          case 'ArrowUp':
            if (currentRow > 0) {
              currentRow--;
            } else {
              focusSection = 'topbar';
            }
            updateFocus();
            break;
          case 'ArrowDown':
            currentRow = Math.min(data.length - 1, currentRow + 1);
            updateFocus();
            break;
          case 'ArrowLeft':
            currentCol = Math.max(0, currentCol - 1);
            updateFocus();
            break;
          case 'ArrowRight':
            var currentItems = data[currentRow] && data[currentRow].items;
            var maxCol = (currentItems && currentItems.length) || 1;
            currentCol = Math.min(maxCol - 1, currentCol + 1);
            updateFocus();
            break;
          case 'Enter':
          case 'OK':
            var item = data[currentRow] && data[currentRow].items && data[currentRow].items[currentCol];
            if (item) openModal(item);
            break;
        }
      }
    }
  });

  initializeApp();
});

const style = document.createElement('style');
style.textContent = `@keyframes spin { from {transform: rotate(0deg);} to {transform: rotate(360deg);} }`;
document.head.appendChild(style);
// ==========================================
// ĐOẠN CODE CHỐNG COPY, CHUỘT PHẢI, F12
// ==========================================

// 1. Chống nhấn chuột phải
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});

// 2. Chống bôi đen (chọn văn bản) và copy
document.addEventListener('selectstart', function(e) {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
});
document.addEventListener('copy', function(e) {
  e.preventDefault();
});

// 3. Chống F12 và các phím tắt mở DevTools (Ctrl+Shift+I/J/C, Ctrl+U)
document.addEventListener('keydown', function(e) {
  // Chống F12
  if (e.key === 'F12' || e.keyCode === 123) {
    e.preventDefault();
  }
  // Chống Ctrl + Shift + I / J / C
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
    e.preventDefault();
  }
  // Chống Ctrl + U (Xem nguồn trang)
  if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
    e.preventDefault();
  }
});
