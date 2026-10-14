const fs = require('node:fs/promises');
const path = require('node:path');
const { ROOT, refreshMap, checkMap, digest } = require('./code-map.cjs');

async function verifyDeliveryMap(directory, expectedDigest) {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, 'REVISAO.json'), 'utf8'));
  if (manifest.sourceDigest !== expectedDigest) throw Error('Mapa de outra revisão no pacote.');
  for (const [file, hash] of Object.entries(manifest.files)) {
    const target = path.resolve(directory, file);
    if (path.dirname(target) !== path.resolve(directory)) throw Error('Caminho inválido no manifesto.');
    if (digest(await fs.readFile(target)) !== hash) throw Error('Mapa corrompido no pacote: ' + file);
  }
  for (const file of ['PROJECT_INDEX.json', 'GRAFO-CODIGO.json']) {
    if (!manifest.files[file]) throw Error('Mapa obrigatório ausente: ' + file);
    const map = JSON.parse(await fs.readFile(path.join(directory, file), 'utf8'));
    if (map.sourceDigest !== expectedDigest) throw Error('Índice/grafo de outra revisão.');
  }
  return manifest;
}

async function packageLight({ root = ROOT, createShortcut = process.platform === 'win32' } = {}) {
  const { graph, revision } = refreshMap({ root });
  const built = JSON.parse(await fs.readFile(path.join(root, 'dist', 'BUILD-REVISION.json'), 'utf8'));
  if (built.sourceDigest !== graph.sourceDigest) throw Error('Build desatualizado. Execute pnpm build antes de pnpm package.');
  const out = path.resolve(root, 'release', 'CNC-Torno-Leve');
  await fs.mkdir(out, { recursive: true });
  for (const folder of ['app', 'mapa']) {
    const target = path.resolve(out, folder);
    if (path.dirname(target) !== out || !out.startsWith(path.resolve(root) + path.sep)) throw Error('Destino inválido.');
    await fs.rm(target, { recursive: true, force: true });
    await fs.cp(folder === 'app' ? path.join(root, 'dist') : revision, target, { recursive: true });
  }
  for (const file of ['Iniciar-CNC-Leve.cmd', 'Iniciar-CNC-Leve.vbs', 'Servidor-CNC.ps1', 'Usuarios-CNC.ps1', 'LEIA-ME.txt']) {
    await fs.copyFile(path.join(root, 'lightweight', file), path.join(out, file));
  }
  await fs.copyFile(path.join(root, 'public/assets/torno-cnc.ico'), path.join(out, 'torno-cnc.ico'));
  if(createShortcut)require('node:child_process').execFileSync('wscript.exe',[path.join(out,'Iniciar-CNC-Leve.vbs'),'/atalho'],{windowsHide:true});
  await verifyDeliveryMap(path.join(out, 'mapa'), graph.sourceDigest);
  if (checkMap(root).length) throw Error('Fontes mudaram durante o empacotamento. Reconstrua a entrega.');
  console.log(out + '\nMapa incluído e conferido: ' + graph.sourceDigest.slice(0, 16));
  return out;
}

if (require.main === module) packageLight().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { packageLight, verifyDeliveryMap };
