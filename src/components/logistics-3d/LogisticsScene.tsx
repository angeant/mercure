"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Html, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Truck } from "./Truck";
import { Warehouse } from "./Warehouse";
import { Road, Terrain } from "./Road";

// Tipos de datos
interface ShipmentData {
  id: number;
  deliveryNoteNumber: string | null;
  status: string;
  senderName: string;
  recipientName: string;
  packageCount: number;
  weightKg: number;
}

interface TripData {
  id: number;
  origin: string;
  destination: string;
  status: string;
  vehiclePlate: string | null;
  shipments: ShipmentData[];
  progress: number; // 0-1
  departureTime: string | null; // Hora de salida
  estimatedArrival: string | null; // Hora estimada de llegada
}

interface WarehouseData {
  id: string;
  name: string;
  city: string;
  position: [number, number, number];
  shipments: ShipmentData[];
  trucks: TripData[];
}

interface LogisticsSceneProps {
  warehouseData: WarehouseData[];
  tripsInTransit: TripData[];
  onSelectShipments: (shipments: ShipmentData[], title: string) => void;
}

// Componente de camión animado en ruta
function AnimatedTruck({
  trip,
  startPos,
  endPos,
  onSelect,
  isSelected,
}: {
  trip: TripData;
  startPos: [number, number, number];
  endPos: [number, number, number];
  onSelect: () => void;
  isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    // Calcular posición basada en progreso
    const t = trip.progress;
    const x = startPos[0] + (endPos[0] - startPos[0]) * t;
    const z = startPos[2] + (endPos[2] - startPos[2]) * t;
    
    // Calcular rotación para que mire hacia el destino
    const angle = Math.atan2(endPos[2] - startPos[2], endPos[0] - startPos[0]);
    
    setPosition([x, 0, z]);
    setRotation([0, -angle + Math.PI, 0]);
  }, [trip.progress, startPos, endPos]);

  // Animación suave
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(Date.now() * 0.008) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <Truck
        position={[0, 0, 0]}
        color="#F97316"
        shipmentCount={trip.shipments.length}
        onClick={onSelect}
        isSelected={isSelected}
        animate={true}
      />
      
      {/* Info del viaje sobre el camión */}
      <Html position={[0, 1.5, 0]} center distanceFactor={6}>
        <div 
          className={`
            bg-white rounded-lg shadow-xl px-3 py-2 cursor-pointer
            transition-all duration-200 border-2 min-w-[140px]
            ${isSelected ? 'border-orange-500 scale-105' : 'border-transparent hover:border-orange-200'}
          `}
          onClick={onSelect}
        >
          <div className="text-xs font-bold text-orange-600 flex items-center gap-1">
            🚚 {trip.vehiclePlate || `Viaje #${trip.id}`}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            {trip.origin} → {trip.destination}
          </div>
          {trip.departureTime && (
            <div className="flex justify-between text-[10px] mt-1 pt-1 border-t border-neutral-100">
              <span className="text-neutral-400">Salió:</span>
              <span className="font-medium text-neutral-600">{trip.departureTime}</span>
            </div>
          )}
          {trip.estimatedArrival && (
            <div className="flex justify-between text-[10px]">
              <span className="text-neutral-400">Llega:</span>
              <span className="font-medium text-green-600">{trip.estimatedArrival}</span>
            </div>
          )}
          <div className="mt-1 pt-1 border-t border-neutral-100">
            <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
              📦 {trip.shipments.length} envíos
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Escena principal
function Scene({
  warehouseData,
  tripsInTransit,
  onSelectShipments,
}: LogisticsSceneProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Posiciones de los depósitos
  const bsasPos: [number, number, number] = [-6, 0, 0];
  const jujuyPos: [number, number, number] = [6, 0, 0];

  const handleWarehouseClick = (warehouse: WarehouseData) => {
    setSelectedItem(`warehouse-${warehouse.id}`);
    onSelectShipments(
      warehouse.shipments,
      `${warehouse.name} - ${warehouse.city}`
    );
  };

  const handleTripClick = (trip: TripData) => {
    setSelectedItem(`trip-${trip.id}`);
    onSelectShipments(
      trip.shipments,
      `En ruta: ${trip.origin} → ${trip.destination}`
    );
  };

  const bsasWarehouse = warehouseData.find(w => w.id === "bsas");
  const jujuyWarehouse = warehouseData.find(w => w.id === "jujuy");

  return (
    <>
      {/* Cámara fija - vista desde arriba en ángulo */}
      <PerspectiveCamera makeDefault position={[0, 10, 8]} fov={45} />

      {/* Iluminación */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Entorno */}
      <Environment preset="city" />
      <fog attach="fog" args={["#f5f5f5", 20, 50]} />

      {/* Terreno */}
      <Terrain />

      {/* Carretera principal */}
      <Road start={[-4, 0, 0]} end={[4, 0, 0]} width={1} />

      {/* Depósito Buenos Aires */}
      {bsasWarehouse && (
        <Warehouse
          position={bsasPos}
          name={bsasWarehouse.name}
          city={bsasWarehouse.city}
          shipmentCount={bsasWarehouse.shipments.length}
          truckCount={bsasWarehouse.trucks.length}
          onClick={() => handleWarehouseClick(bsasWarehouse)}
          isSelected={selectedItem === `warehouse-${bsasWarehouse.id}`}
          color="#3b82f6"
        />
      )}

      {/* Depósito Jujuy */}
      {jujuyWarehouse && (
        <Warehouse
          position={jujuyPos}
          name={jujuyWarehouse.name}
          city={jujuyWarehouse.city}
          shipmentCount={jujuyWarehouse.shipments.length}
          truckCount={jujuyWarehouse.trucks.length}
          onClick={() => handleWarehouseClick(jujuyWarehouse)}
          isSelected={selectedItem === `warehouse-${jujuyWarehouse.id}`}
          color="#22c55e"
        />
      )}

      {/* Camiones en depósitos */}
      {warehouseData.flatMap(warehouse =>
        warehouse.trucks.map((trip, i) => {
          const basePos = warehouse.id === "bsas" ? bsasPos : jujuyPos;
          const offset = warehouse.id === "bsas" ? 2.5 : -2.5;
          return (
            <group key={`parked-${trip.id}`}>
              <Truck
                position={[basePos[0] + offset, 0, basePos[2] + 2 + i * 1.2]}
                rotation={[0, warehouse.id === "bsas" ? Math.PI / 2 : -Math.PI / 2, 0]}
                color="#F97316"
                shipmentCount={trip.shipments.length}
                onClick={() => handleTripClick(trip)}
                isSelected={selectedItem === `trip-${trip.id}`}
              />
              {/* Label del camión estacionado */}
              <Html 
                position={[basePos[0] + offset, 1.2, basePos[2] + 2 + i * 1.2]} 
                center 
                distanceFactor={8}
              >
                <div 
                  className="bg-white/90 rounded px-2 py-1 text-[10px] shadow cursor-pointer hover:bg-orange-50"
                  onClick={() => handleTripClick(trip)}
                >
                  <span className="font-medium">{trip.vehiclePlate || `#${trip.id}`}</span>
                  <span className="text-neutral-400 ml-1">• {trip.shipments.length} env.</span>
                </div>
              </Html>
            </group>
          );
        })
      )}

      {/* Camiones en tránsito */}
      {tripsInTransit.map(trip => {
        const isGoingToJujuy = trip.destination.toLowerCase().includes("jujuy");
        const startP = isGoingToJujuy ? bsasPos : jujuyPos;
        const endP = isGoingToJujuy ? jujuyPos : bsasPos;
        
        return (
          <AnimatedTruck
            key={`transit-${trip.id}`}
            trip={trip}
            startPos={[startP[0] + 3, 0, startP[2]]}
            endPos={[endP[0] - 3, 0, endP[2]]}
            onSelect={() => handleTripClick(trip)}
            isSelected={selectedItem === `trip-${trip.id}`}
          />
        );
      })}
    </>
  );
}

// Componente exportable con Canvas
export function LogisticsScene3D(props: LogisticsSceneProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-100 to-neutral-100 rounded-lg overflow-hidden">
      <Canvas shadows>
        <Suspense fallback={
          <Html center>
            <div className="flex items-center gap-2 text-neutral-500">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Cargando escena 3D...
            </div>
          </Html>
        }>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export type { ShipmentData, TripData, WarehouseData };
