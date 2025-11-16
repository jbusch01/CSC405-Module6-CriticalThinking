'use strict';

let canvas, gl;
let positions = [];
let normals = [];
let numVertices = 0;
let numSubdivisions = 3;

let positionBuffer, normalBuffer;
let aPositionLoc, aNormalLoc;
let uModelViewMatrixLoc, uProjectionMatrixLoc, uNormalMatrixLoc;
let uLightPositionLoc, uAmbientProductLoc, uDiffuseProductLoc, uSpecularProductLoc, uShininessLoc;

let angle = 0;
let lastTime = 0;

window.onload = function () {
    canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl');
    if (!gl) { alert('WebGL not supported'); return; }

    resize();
    window.addEventListener('resize', resize);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    const vs = compileShaderFromScript(gl.VERTEX_SHADER, 'vertex-shader');
    const fs = compileShaderFromScript(gl.FRAGMENT_SHADER, 'fragment-shader');
    const program = createProgram(vs, fs);
    gl.useProgram(program);

    aPositionLoc = gl.getAttribLocation(program, 'aPosition');
    aNormalLoc = gl.getAttribLocation(program, 'aNormal');

    uModelViewMatrixLoc = gl.getUniformLocation(program, 'uModelViewMatrix');
    uProjectionMatrixLoc = gl.getUniformLocation(program, 'uProjectionMatrix');
    uNormalMatrixLoc = gl.getUniformLocation(program, 'uNormalMatrix');

    uLightPositionLoc = gl.getUniformLocation(program, 'uLightPosition');
    uAmbientProductLoc = gl.getUniformLocation(program, 'uAmbientProduct');
    uDiffuseProductLoc = gl.getUniformLocation(program, 'uDiffuseProduct');
    uSpecularProductLoc = gl.getUniformLocation(program, 'uSpecularProduct');
    uShininessLoc = gl.getUniformLocation(program, 'uShininess');

    positionBuffer = gl.createBuffer();
    normalBuffer = gl.createBuffer();

    buildSphere();
    uploadGeometry();

    const lightPosition = [2.0, 2.0, 2.0, 1.0];
    const lightAmbient = [0.2, 0.2, 0.2, 1.0];
    const lightDiffuse = [1.0, 1.0, 1.0, 1.0];
    const lightSpecular = [1.0, 1.0, 1.0, 1.0];

    const materialAmbient = [0.2, 0.3, 0.8, 1.0];
    const materialDiffuse = [0.2, 0.3, 0.8, 1.0];
    const materialSpecular = [1.0, 1.0, 1.0, 1.0];
    const materialShininess = 64.0;

    const ambientProduct = multiplyVec4(lightAmbient, materialAmbient);
    const diffuseProduct = multiplyVec4(lightDiffuse, materialDiffuse);
    const specularProduct = multiplyVec4(lightSpecular, materialSpecular);

    gl.uniform4fv(uLightPositionLoc, new Float32Array(lightPosition));
    gl.uniform4fv(uAmbientProductLoc, new Float32Array(ambientProduct));
    gl.uniform4fv(uDiffuseProductLoc, new Float32Array(diffuseProduct));
    gl.uniform4fv(uSpecularProductLoc, new Float32Array(specularProduct));
    gl.uniform1f(uShininessLoc, materialShininess);

    window.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp') {
            if (numSubdivisions < 6) {
                numSubdivisions++;
                buildSphere();
                uploadGeometry();
                console.log("Subdivision:", numSubdivisions);
            }
        }
        if (e.key === 'ArrowDown') {
            if (numSubdivisions > 0) {
                numSubdivisions--;
                buildSphere();
                uploadGeometry();
                console.log("Subdivision:", numSubdivisions);
            }
        }
    });

    this.requestAnimationFrame(render);
};

function resize() {
    if (!canvas || !gl) return;
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

function compileShaderFromScript(type, id) {
    const src = document.getElementById(id).textContent;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createProgram(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(p));
    }
    return p;
}

function vec4(x, y, z, w) {
    return [x, y, z, w];
}

function mixVec4(a, b, t) {
    return [
        (1 - t) * a[0] + t * b[0],
        (1 - t) * a[1] + t * b[1],
        (1 - t) * a[2] + t * b[2],
        (1 - t) * a[3] + t * b[3],
    ];
}

function normalizePointOnSphere(v) {
    const x = v[0], y = v[1], z = v[2]
    const len = Math.sqrt(x*x + y*y + z*z);
    return [x/len, y/len, z/len, 1.0];
}

function multiplyVec4(a, b) {
    return [
        a[0]*b[0],
        a[1]*b[1],
        a[2]*b[2],
        a[3]*b[3],
    ];
}

function flatten4(arr) {
    const o = [];
    for (let i=0; i<arr.length; i++) {
        o.push(arr[i][0], arr[i][1], arr[i][2], arr[i][3]);
    }
    return o;
}

function flatten3(arr) {
    const o = [];
    for (let i=0; i<arr.length; i++) {
        o.push(arr[i][0], arr[i][1], arr[i][2]);
    }
    return o;
}

function buildSphere() {
    positions = [];
    normals = [];
    numVertices = 0;

    const va = vec4(0.0, 0.0, -1.0, 1);
    const vb = vec4(0.0, 0.942809, 0.333333, 1);
    const vc = vec4(-0.816497, -0.471405, 0.333333, 1);
    const vd = vec4(0.816497, -0.471405, 0.333333, 1);

    tetrahedron(va, vb, vc, vd, numSubdivisions);
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        let ab = normalizePointOnSphere(mixVec4(a, b, 0.5));
        let ac = normalizePointOnSphere(mixVec4(a, c, 0.5));
        let bc = normalizePointOnSphere(mixVec4(b, c, 0.5));

        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    } else {
        triangle(a, b, c);
    }
}

function triangle(a ,b, c) {
    positions.push(a, b, c);
    normals.push(
        [a[0], a[1], a[2]],
        [b[0], b[1], b[2]],
        [c[0], c[1], c[2]]
    );
    numVertices += 3;
}

function uploadGeometry() {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten4(positions)), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten3(normals)), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aNormalLoc);
    gl.vertexAttribPointer(aNormalLoc, 3, gl.FLOAT, false, 0, 0);
}

function identityMat4() {
    return [
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,0,1
    ];
}

function multiplyMat4(a, b) {
    const out = new Array(16);
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
                sum += a[r * 4 + k] * b[k * 4 + c];
            }
            out[r*4+c] = sum;
        }
    }
    return out;
}

function rotateYMat4(angleDeg) {
    const a = angleDeg * Math.PI / 180;
    const c = Math.cos(a), s = Math.sin(a);
    return [
        c,0,s,0,
        0,1,0,0,
        -s,0,c,0,
        0,0,0,1
    ];
}

function translateMat4(tx, ty, tz) {
    const m = identityMat4();
    m[12] = tx;
    m[13] = ty;
    m[14] = tz;
    return m;
}

function perspectiveMat4(fovyDeg, aspect, near, far) {
    const f = 1.0 / Math.tan((fovyDeg * Math.PI / 180) / 2);
    const nf = 1 / (near - far);
    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 0
    ];
}

function normalMatrixFromModelView(mv) {
    return [
        mv[0], mv[1], mv[2],
        mv[4], mv[5], mv[6],
        mv[8], mv[9], mv[10]
    ];
}

function render(timestamp) {
    const dt = (timestamp - lastTime) * 0.001;
    lastTime = timestamp;
    angle += dt * 30;

    gl.clearColor(0.05, 0.05, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const projection = perspectiveMat4(45, aspect, 0.1, 10.0);

    const rotation = rotateYMat4(angle);
    const translation = translateMat4(0, 0, -3);
    const modelView = multiplyMat4(translation, rotation);

    const normalMatrix = normalMatrixFromModelView(modelView);

    gl.uniformMatrix4fv(uProjectionMatrixLoc, false, new Float32Array(projection));
    gl.uniformMatrix4fv(uModelViewMatrixLoc, false, new Float32Array(modelView));
    gl.uniformMatrix3fv(uNormalMatrixLoc, false, new Float32Array(normalMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    requestAnimationFrame(render)
}