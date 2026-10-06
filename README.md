# Site de apresentação PIVÔ

Site de apresentação da loja PIVÔ (@pivooficial), calçados femininos no Monumental Shopping. A paleta e a logo foram tiradas do Instagram da loja: creme, ferrugem, vinho e kraft.

## Abrir
Execute `npm run dev` e acesse `http://localhost:5180/`. O site precisa ser servido por HTTP, porque usa módulos ES. Abrir o `index.html` direto não funciona.

Para apresentar sem a animação de carregamento, use `http://localhost:5180/?skip`.

## Estrutura
- `index.html`: seções (hero 3D, manifesto, coleção horizontal, caixa 3D, loja, feed, CTA).
- `css/style.css`: tokens de cor e tipografia fluida no topo do arquivo.
- `js/shoe.js`: sandália de salto 3D gerada por código (Three.js), sem modelo externo.
- `js/scenes.js`: cena do hero (sandália na mesinha da loja) e cena da caixa kraft que abre com o scroll.
- `js/main.js`: loader, scroll suave (Lenis), animações (GSAP ScrollTrigger), cursor e efeitos magnéticos.
- `img/`: fotos recortadas do print do Instagram. São de baixa resolução e devem ser trocadas pelas fotos originais da loja antes de publicar.

## Bibliotecas (CDN)
Three.js 0.170, GSAP 3.12 + ScrollTrigger, Lenis 1.1. Fontes: Antonio, Cormorant Garamond e Manrope.

## Antes de publicar
- Trocar as imagens por fotos originais em alta resolução.
- Confirmar com a loja os textos do manifesto e da caixa, e os nomes das categorias.
- Nenhuma publicação foi feita.
