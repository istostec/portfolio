document.addEventListener('DOMContentLoaded', () => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || !motionAllowed) return;

    const cursor = document.getElementById('cursor') || document.createElement('div');
    const ring = document.getElementById('cursorRing') || document.createElement('div');

    if (!cursor.id) {
        cursor.id = 'cursor';
        cursor.className = 'cursor';
        document.body.appendChild(cursor);
    }

    if (!ring.id) {
        ring.id = 'cursorRing';
        ring.className = 'cursor-ring';
        document.body.appendChild(ring);
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    document.addEventListener('pointermove', (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
        cursor.style.left = `${mouseX}px`;
        cursor.style.top = `${mouseY}px`;
    });

    const animateRing = () => {
        ringX += (mouseX - ringX) * 0.18;
        ringY += (mouseY - ringY) * 0.18;
        ring.style.left = `${ringX}px`;
        ring.style.top = `${ringY}px`;
        window.requestAnimationFrame(animateRing);
    };

    animateRing();
});
