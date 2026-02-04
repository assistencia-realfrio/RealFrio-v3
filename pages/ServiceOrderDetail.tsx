    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const pedidoText = (os.description || "NÃO ESPECIFICADO").toUpperCase();
    const splitDesc = doc.splitTextToSize(pedidoText, pageWidth - (margin * 2) - 25);
    doc.text(splitDesc, margin + 8, margin + 138);
    
    // Data de Entrada (Canto inferior direito)
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const dateStr = `ENTRADA: ${new Date(os.created_at).toLocaleDateString('pt-PT')}`;
    doc.text(dateStr, pageWidth - margin - 8, margin + 164, { align: "right" });

    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    setTagPdfUrl(String(blobUrl));
    setShowTagPreview(true);
  };