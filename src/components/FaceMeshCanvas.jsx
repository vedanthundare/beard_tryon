import React, { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";


function Beard({ position, rotation, scale }) {
  const beardRef = useRef();
  const { scene } = useGLTF("/beard.glb"); 

  useEffect(() => {
    if (beardRef.current) {
      beardRef.current.position.set(...position);
      beardRef.current.rotation.set(...rotation);
      beardRef.current.scale.set(scale, scale, scale);
    }
  }, [position, rotation, scale]);

  return <primitive ref={beardRef} object={scene} />;
}

function SceneContent({ facePosition, faceRotation, faceScale }) {
  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 10]} />
      <Beard
        position={facePosition}
        rotation={faceRotation}
        scale={faceScale}
      />
      <OrbitControls />
    </>
  );
}

export default function FaceMeshCanvas() {
  const videoRef = useRef(null);
  const [facePosition, setFacePosition] = useState([0, 0, 0]);
  const [faceRotation, setFaceRotation] = useState([0, 0, 0]);
  const [faceScale, setFaceScale] = useState(1.2); 

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (
        results.multiFaceLandmarks &&
        results.multiFaceLandmarks.length > 0
      ) {
        const landmarks = results.multiFaceLandmarks[0];

        const toThree = (pt) => [
          (pt.x - 0.5) * -6,
          (pt.y - 0.5) * -6,
          pt.z * -6,
        ];

        const chin = toThree(landmarks[152]);
        const leftEar = toThree(landmarks[234]);
        const rightEar = toThree(landmarks[454]);
        const noseTip = toThree(landmarks[1]);


        const beardYOffset = 0.05;
        setFacePosition([chin[0], chin[1] + beardYOffset, chin[2]]);

        const earDist = Math.sqrt(
          (leftEar[0] - rightEar[0]) ** 2 +
            (leftEar[1] - rightEar[1]) ** 2 +
            (leftEar[2] - rightEar[2]) ** 2
        );
        const scale = earDist * 10;
        setFaceScale(scale);

        const dx = rightEar[0] - leftEar[0];
        const dy = rightEar[1] - leftEar[1];
        const dz = rightEar[2] - leftEar[2];


        const angleX = Math.atan2(dz, dx);  
        const angleY = Math.atan2(dz, dx);  
        const angleZ = Math.atan2(dy, dx);  
        setFaceRotation([angleX, angleY, angleZ]);
      }
    });

    if (videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          await faceMesh.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, []);

  return (
    <>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          transform: "scaleX(-1)",
          zIndex: 1,
        }}
      />

      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 2,
        }}
      >
        <SceneContent
          facePosition={facePosition}
          faceRotation={faceRotation}
          faceScale={faceScale}
        />
      </Canvas>
    </>
  );
}