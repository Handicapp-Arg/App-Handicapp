import { Redirect } from 'expo-router';
import { Routes } from '../../lib/routes';

/**
 * Entrada del grupo de pestañas. Antes caía en el muro, que ni siquiera tenía
 * pestaña abajo: se arrancaba en una pantalla no representada en la barra.
 * Ahora abre en el Inicio, que es la primera pestaña.
 */
export default function Index() {
  return <Redirect href={Routes.tabsInicio as never} />;
}
