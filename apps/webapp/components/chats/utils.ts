export const formatMessageDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  if (isSameDay(dateObj, today)) {
    return 'Hoje';
  }

  if (isSameDay(dateObj, yesterday)) {
    return 'Ontem';
  }

  const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const dayName = days[dateObj.getDay()] ?? '';
  const day = dateObj.getDate();
  const monthName = months[dateObj.getMonth()] ?? '';

  return `${dayName[0]?.toUpperCase()}${dayName.slice(1)}, ${day} de ${monthName}`;
};
