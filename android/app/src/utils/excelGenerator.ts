import XLSX from 'xlsx';
import { Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';

interface ParticipantePago {
  nombre: string;
  totalPagado: number;
  asistio: boolean;
  createdAt?: string;
}

interface PagoRegistro {
  participanteNombre: string;
  monto: number;
  fecha: string;
  observacion?: string;
}

/**
 * Genera un archivo Excel con los datos de pago de los participantes
 */
export const generarExcelPagos = async (
  eventoNombre: string,
  participantes: ParticipantePago[],
  pagos: PagoRegistro[],
  costoUnitario: number
) => {
  try {
    // Crear el libro de Excel
    const workbook = XLSX.utils.book_new();

    // ─── SHEET 1: Resumen de Participantes ───
    const participantesData = participantes.map((p, index) => ({
      '#': index + 1,
      'Nombre': p.nombre,
      'Total Pagado': p.totalPagado,
      'Costo Unitario': costoUnitario,
      'Saldo': Math.max(costoUnitario - p.totalPagado, 0),
      'Estado': p.totalPagado >= costoUnitario ? 'Al día' : 'Debe',
      'Asistió': p.asistio ? 'Sí' : 'No',
    }));

    const ws1 = XLSX.utils.json_to_sheet(participantesData);
    
    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 4 },  // #
      { wch: 20 }, // Nombre
      { wch: 13 }, // Total Pagado
      { wch: 15 }, // Costo Unitario
      { wch: 10 }, // Saldo
      { wch: 10 }, // Estado
      { wch: 10 }, // Asistió
    ];
    ws1['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, ws1, 'Participantes');

    // ─── SHEET 2: Detalle de Pagos ───
    const pagosData = pagos.map((p, index) => ({
      '#': index + 1,
      'Participante': p.participanteNombre,
      'Monto': p.monto,
      'Fecha': p.fecha,
      'Observación': p.observacion || '–',
    }));

    const ws2 = XLSX.utils.json_to_sheet(pagosData);
    ws2['!cols'] = [
      { wch: 4 },
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(workbook, ws2, 'Pagos');

    // ─── SHEET 3: Métricas ───
    const totalRecaudado = participantes.reduce((acc, p) => acc + p.totalPagado, 0);
    const totalDeuda = participantes.reduce(
      (acc, p) => acc + Math.max(costoUnitario - p.totalPagado, 0),
      0
    );
    const metaTotal = costoUnitario * participantes.length;
    const porcentajeRecaudado = metaTotal > 0 ? (totalRecaudado / metaTotal) * 100 : 0;

    const metricsData = [
      ['RESUMEN DE EVENTO'],
      ['Evento:', eventoNombre],
      ['Fecha Descarga:', new Date().toLocaleDateString('es-ES')],
      [''],
      ['MÉTRICAS FINANCIERAS'],
      ['Total Participantes:', participantes.length],
      ['Costo por Persona:', `$${costoUnitario}`],
      ['Meta Total:', `$${metaTotal.toLocaleString()}`],
      ['Total Recaudado:', `$${totalRecaudado.toLocaleString()}`],
      ['Total Adeudado:', `$${totalDeuda.toLocaleString()}`],
      ['Porcentaje Recaudado:', `${porcentajeRecaudado.toFixed(2)}%`],
      ['Participantes Al Día:', participantes.filter(p => p.totalPagado >= costoUnitario).length],
      ['Participantes en Deuda:', participantes.filter(p => p.totalPagado < costoUnitario).length],
      ['Participantes que Asistieron:', participantes.filter(p => p.asistio).length],
    ];

    const ws3 = XLSX.utils.aoa_to_sheet(metricsData);
    ws3['!cols'] = [{ wch: 25 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(workbook, ws3, 'Métricas');

    // ─── Generar archivo ───
    const nombreArchivo = `Pagos_${eventoNombre.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
    const rutaArchivo = await guardarExcel(workbook, nombreArchivo);

    return rutaArchivo;
  } catch (error) {
    console.error('Error generando Excel:', error);
    throw error;
  }
};

/**
 * Guarda el archivo Excel en el dispositivo
 */
const guardarExcel = async (workbook: XLSX.WorkBook, nombreArchivo: string): Promise<string> => {
  try {
    // Escribir el workbook como bytes
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    let rutaGuardada: string;

    if (Platform.OS === 'android') {
      const isAndroid30OrHigher = Platform.Version >= 30;
      let rutaDescargas: string;

      if (!isAndroid30OrHigher) {
        // Solicitar permisos en Android 10 y anteriores
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Permiso para guardar archivo',
            message: 'La app necesita permiso para guardar el archivo Excel',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Permiso denegado');
        }

        // Guardar en Descargas públicas
        rutaDescargas = `${RNFetchBlob.fs.dirs.DownloadDir}/${nombreArchivo}`;
      } else {
        // En Android 11+ usar la caché de la app para compartir el archivo con otras aplicaciones
        const rutaCache = `${RNFetchBlob.fs.dirs.CacheDir}/${nombreArchivo}`;
        rutaDescargas = rutaCache;
      }

      await RNFetchBlob.fs.writeFile(rutaDescargas, wbout, 'base64');
      rutaGuardada = rutaDescargas;
    } else {
      // iOS
      const rutaDocumentos = `${RNFetchBlob.fs.dirs.DocumentDir}/${nombreArchivo}`;
      await RNFetchBlob.fs.writeFile(rutaDocumentos, wbout, 'base64');
      rutaGuardada = rutaDocumentos;
    }

    return rutaGuardada;
  } catch (error) {
    console.error('Error guardando Excel:', error);
    throw error;
  }
};