<?php
// cadastros-aba/index.php — Shell CSGourmet + SPA de cadastros (React).
require_once __DIR__ . '/../config/functions.php';
requireLogin();

$isAdmin = (strtolower((string) ($_SESSION['cargo'] ?? '')) === 'admin')
    || (($_SESSION['perfil'] ?? '') === 'admin');
$cargoUser = strtolower((string) ($_SESSION['cargo'] ?? ($isAdmin ? 'admin' : 'garcom')));
if (in_array($cargoUser, ['garcom', 'entregador'], true)) {
    header('Location: /CSGourmet/index.php');
    exit;
}

$pageTitle = 'Cadastros — CS Gourmet';
$activeMenu = 'cadastros';
require_once __DIR__ . '/../includes/header.php';

$distIndex = __DIR__ . '/dist/index.html';
$distOk = is_file($distIndex);
$v = $distOk ? (string) filemtime($distIndex) : (string) time();
$src = '/CSGourmet/cadastros-aba/dist/index.html?v=' . rawurlencode($v);
// Atalho de outras telas (ex.: "Cadastrar novo garçom" do QR): abre a aba e o formulário direto.
$abaUrl = preg_replace('/[^a-z]/', '', (string) ($_GET['aba'] ?? ''));
if ($abaUrl !== '') { $src .= '&aba=' . rawurlencode($abaUrl); }
if (($_GET['novo'] ?? '') === '1') { $src .= '&novo=1'; }
?>
<style>
  .csg-cadastros-aba-wrap {
    flex: 1;
    min-height: 0;
    margin: 0;
    height: 100%;
    overflow: hidden;
    border-radius: 0;
    background: #fff;
  }
  .csg-cadastros-aba-wrap iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
  }
  html[data-theme="dark"] .csg-cadastros-aba-wrap {
    background: #12151b;
  }
  html[data-theme="dark"] .csg-cadastros-aba-wrap iframe {
    background: #12151b;
  }
  .csg-cadastros-aba-wrap.is-modal-open {
    position: relative;
    z-index: 100002;
  }
  #csg-cad-aba-dim {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 100001;
    background: rgba(15, 23, 42, 0.55);
  }
  html[data-theme="dark"] #csg-cad-aba-dim {
    background: rgba(0, 0, 0, 0.72);
  }
  #csg-cad-aba-dim.is-on { display: block; }
  .csg-cadastros-aba-missing {
    padding: 2rem;
    text-align: center;
    color: #64748b;
    font-size: .95rem;
  }
  html[data-theme="dark"] .csg-cadastros-aba-missing { color: #9aa1ad; }
</style>
<div id="csg-cad-aba-dim" aria-hidden="true"></div>
<div class="csg-cadastros-aba-wrap" id="csg-cadastros-aba-wrap">
  <?php if ($distOk): ?>
    <iframe id="csg-cadastros-aba" title="Cadastros" src="<?= htmlspecialchars($src, ENT_QUOTES, 'UTF-8') ?>"></iframe>
  <?php else: ?>
    <div class="csg-cadastros-aba-missing">
      <p><strong>Cadastros (novo)</strong> ainda não foi gerado.</p>
      <p style="margin-top:.75rem">No PC de desenvolvimento rode:<br>
        <code>cd cadastros-aba &amp;&amp; npm run build:spa</code>
      </p>
    </div>
  <?php endif; ?>
</div>
<script>
(function () {
  var dim = document.getElementById('csg-cad-aba-dim');
  var wrap = document.getElementById('csg-cadastros-aba-wrap');
  var iframe = document.getElementById('csg-cadastros-aba');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function pushTheme() {
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ type: 'csg-theme', theme: currentTheme() }, '*');
    } catch (e) {}
  }

  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.type !== 'csg-cadastros-modal') return;
    var on = !!d.open;
    if (dim) {
      dim.classList.toggle('is-on', on);
      dim.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    if (wrap) wrap.classList.toggle('is-modal-open', on);
  });

  if (iframe) {
    iframe.addEventListener('load', pushTheme);
  }
  try {
    new MutationObserver(pushTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  } catch (e) {}
  // fallback: tema pode mudar via toggle sem MutationObserver em alguns browsers
  document.getElementById('sb-theme-toggle')?.addEventListener('change', function () {
    setTimeout(pushTheme, 0);
  });
})();
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
