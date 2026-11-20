import { t } from '../i18n.js';

let youtubeApi;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeApi) {
    youtubeApi = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => { script.remove(); reject(new Error('YouTube API unavailable')); };
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      document.head.append(script);
    }).catch(error => {
      youtubeApi = null;
      throw error;
    });
  }
  return youtubeApi;
}

export function initVideoDialog() {
  const dialog = document.getElementById('video-dialog');
  const mount = document.getElementById('video-player');
  const status = document.getElementById('video-status');
  const link = document.getElementById('video-external');
  const title = document.getElementById('video-title');
  let dispose = () => {};

  dialog.querySelector('[data-close-video]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (!dialog.open) dispose(); });
  document.addEventListener('languagechange', () => { status.textContent = t('videoUnavailable'); });

  return video => {
    dispose();
    title.textContent = video.title;
    link.href = `https://www.youtube.com/watch?v=${video.id}`;
    status.hidden = true;
    dialog.showModal();

    const url = new URL(`https://www.youtube.com/embed/${video.id}`);
    url.search = new URLSearchParams({ enablejsapi: '1', origin: location.origin, autoplay: '1', playsinline: '1', rel: '0' });
    const frame = document.createElement('iframe');
    frame.id = 'video-frame';
    frame.title = video.title;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    frame.src = url.href;
    mount.replaceChildren(frame);

    let player;
    let active = true;
    const fail = () => {
      if (!active || !dialog.open) return;
      dispose();
      status.textContent = t('videoUnavailable');
      status.hidden = false;
    };
    const timeout = setTimeout(fail, 12000);
    dispose = () => {
      active = false;
      clearTimeout(timeout);
      player?.destroy();
      mount.replaceChildren();
    };

    loadYouTubeApi().then(YT => {
      if (!active || !dialog.open) return;
      player = new YT.Player(frame, { events: { onReady: () => clearTimeout(timeout), onError: fail } });
    }).catch(fail);
  };
}
