import React, { useState, useEffect, useId, useMemo } from 'react';
import { 
  Box, 
  Heading, 
  Image, 
  SimpleGrid, 
  Text, 
  Spinner,
  Skeleton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useDisclosure,
  IconButton,
  Flex
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '@chakra-ui/icons';
import { getMarketUpdateMediaItems } from '../content/marketUpdateMedia';

const bundledMarketImages = import.meta.glob(
  './images/market-updates/**/*.{png,jpg,jpeg}',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
) as Record<string, string>;

type MarketMediaItem = {
  name: string;
  url: string;
  type: 'image' | 'video';
  alt?: string;
};

interface MarketUpdateGalleryProps {
  date: string; // Format: 'dmu14mar' or 'DD/MM/YYYY'
  showTestImage?: boolean;
  title?: string;
  imageCount?: number;
  apiDateFormat?: boolean; // Flag to indicate if date is in DD/MM/YYYY format
  mediaItems?: Array<Partial<MarketMediaItem> & { url: string }>;
  showEmptyState?: boolean;
}

const MarketUpdateGallery: React.FC<MarketUpdateGalleryProps> = ({
  date,
  title = "Supporting Charts & Data",
  imageCount = 6,
  apiDateFormat = false,
  mediaItems,
  showEmptyState = false,
}) => {
  const [images, setImages] = useState<MarketMediaItem[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState<{[key: string]: boolean}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const galleryHeadingId = useId();
  const modalTitleId = useId();

  // Format the folder path based on date format
  const formatFolderPath = (dateStr: string, isApiFormat: boolean): string => {
    if (isApiFormat && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      // For DD/MM/YYYY format
      return `market-updates/${dateStr}`;
    } else {
      // For 'dmuXXmon' format
      return `market-updates/${dateStr}`;
    }
  };
  
  const folderPath = formatFolderPath(date, apiDateFormat);
  const bundledImagesForFolder = useMemo(
    () =>
      Object.entries(bundledMarketImages)
        .filter(([path]) => path.includes(`/${folderPath}/`))
        .map(([path, url]) => ({
          name: path.split('/').pop() || path,
          url,
          type: 'image' as const,
        })),
    [folderPath],
  );

  const explicitMediaItems = useMemo(
    () =>
      mediaItems
        ? mediaItems
        .filter((item) => Boolean(item.url))
        .map((item, index) => ({
          name: item.name || item.url.split('/').pop() || `media-${index + 1}`,
          url: item.url,
          type: item.type || (/\.(mp4|mov|webm)$/i.test(item.url) ? 'video' : 'image'),
          alt: item.alt,
        }))
        : [],
    [mediaItems],
  );

  const manifestMediaItems = useMemo(
    () => getMarketUpdateMediaItems(date),
    [date],
  );

  const knownMediaItems = useMemo(() => {
    const media = [...bundledImagesForFolder, ...manifestMediaItems, ...explicitMediaItems];

    return Array.from(new Map(media.map((item) => [item.url, item])).values()).sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
      const prefixRank = (name: string) => (name.startsWith('m') ? 1 : name.startsWith('q') ? 2 : 0);
      return numA - numB || prefixRank(a.name) - prefixRank(b.name) || a.name.localeCompare(b.name);
    });
  }, [bundledImagesForFolder, manifestMediaItems, explicitMediaItems]);

  useEffect(() => {
    setIsLoading(true);
    setImages(knownMediaItems);
    setImagesLoaded({});
    setIsLoading(false);
  }, [knownMediaItems]);

  const handleImageLoad = (imageName: string) => {
    setImagesLoaded(prev => ({
      ...prev,
      [imageName]: true
    }));
  };

  const getChartLabel = (imageName: string) => imageName.match(/\d+/)?.[0] || imageName;

  const handleImageClick = (imageIndex: number) => {
    setSelectedImageIndex(imageIndex);
    onOpen();
  };

  const handlePreviousImage = () => {
    setSelectedImageIndex(currentIndex => {
      if (currentIndex === null || images.length === 0) {
        return currentIndex;
      }

      return (currentIndex - 1 + images.length) % images.length;
    });
  };

  const handleNextImage = () => {
    setSelectedImageIndex(currentIndex => {
      if (currentIndex === null || images.length === 0) {
        return currentIndex;
      }

      return (currentIndex + 1) % images.length;
    });
  };

  const selectedImage = selectedImageIndex === null ? null : images[selectedImageIndex];
  const hasCarouselControls = images.length > 1 && selectedImageIndex !== null;

  if (!isLoading && images.length === 0 && !showEmptyState) {
    return null;
  }

  // Generate skeleton placeholders
  const renderSkeletons = () => {
    const skeletonCount = Math.max(imageCount, knownMediaItems.length || 0);

    return Array(skeletonCount).fill(0).map((_, index) => (
      <Box 
        key={`skeleton-${index}`} 
        borderRadius="lg" 
        overflow="hidden"
        boxShadow="md"
        bg="white"
        p={2}
        maxW="100%"
      >
        <Skeleton
          height="300px"
          fadeDuration={1}
          borderRadius="md"
          startColor="gray.100"
          endColor="gray.300"
          speed={1.2}
        />
      </Box>
    ));
  };

  return (
    <Box as="section" mt={8} maxW="100%" minW={0} overflowX="hidden" aria-labelledby={galleryHeadingId}>
      <Heading
        as="h3"
        id={galleryHeadingId}
        fontSize="lg"
        color="black"
        mb={4}
      >
        {title}
      </Heading>
      
      {/* Gallery of images */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} minW={0}>
        {isLoading ? (
          // Show skeletons while loading
          renderSkeletons()
        ) : images.length > 0 ? (
          // Show actual images once loaded
          images.map((image, index) => (
            <Box 
              as="button"
              type="button"
              key={image.name} 
              borderRadius="lg" 
              overflow="hidden"
              boxShadow="md"
              bg="white"
              p={2}
              position="relative"
              cursor="pointer"
              onClick={() => handleImageClick(index)}
              aria-label={`Open market analysis chart ${getChartLabel(image.name)}`}
              textAlign="left"
              maxW="100%"
              minW={0}
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.02)' }}
              _focus={{ outline: 'none' }}
              _focusVisible={{
                boxShadow: '0 0 0 3px rgba(43, 140, 238, 0.55)',
                outline: 'none',
              }}
            >
              {/* Skeleton loader */}
              <Skeleton
                isLoaded={imagesLoaded[image.name]}
                fadeDuration={1}
                borderRadius="md"
                startColor="gray.100"
                endColor="gray.300"
                speed={1.2}
              >
                {image.type === 'video' ? (
                  <Box
                    as="video"
                    src={image.url}
                    aria-label={image.alt || `Market analysis video ${getChartLabel(image.name)}`}
                    controls
                    borderRadius="md"
                    w="100%"
                    maxW="100%"
                    minH="300px"
                    maxH="400px"
                    bg="black"
                    onLoadedData={() => handleImageLoad(image.name)}
                  />
                ) : (
                  <Image
                    src={image.url}
                    alt={image.alt || `Market Analysis Chart ${getChartLabel(image.name)}`}
                    borderRadius="md"
                    objectFit="contain"
                    w="100%"
                    maxW="100%"
                    minH="300px"
                    maxH="400px"
                    loading="lazy"
                    bg="gray.50"
                    onLoad={() => handleImageLoad(image.name)}
                    onError={(e) => {
                      const parent = e.currentTarget.parentElement?.parentElement;
                      if (parent) {
                        parent.style.display = 'none';
                      }
                    }}
                  />
                )}
              </Skeleton>

              {/* Optional loading spinner overlay */}
              {!imagesLoaded[image.name] && (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  zIndex="1"
                >
                  <Spinner
                    aria-hidden="true"
                    size="md"
                    color="blue.500"
                    thickness="3px"
                    speed="0.8s"
                  />
                </Box>
              )}
            </Box>
          ))
        ) : (
          // Show a message if no images were found
          <Box textAlign="center" gridColumn="1 / -1" py={8}>
            <Text color="gray.500">No images available for this update.</Text>
          </Box>
        )}
      </SimpleGrid>

      {/* Full-screen image modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="full" isCentered>
        <ModalOverlay bg="blackAlpha.900" />
        <ModalContent
          bg="transparent"
          maxW="100vw"
          maxH="100vh"
          m={0}
          p={0}
          aria-labelledby={selectedImage ? modalTitleId : undefined}
        >
          <ModalBody p={0} display="flex" alignItems="center" justifyContent="center">
            {selectedImage && (
              <Text
                as="h2"
                id={modalTitleId}
                className="sr-only"
                position="absolute"
                w="1px"
                h="1px"
                p={0}
                m="-1px"
                overflow="hidden"
                clipPath="inset(50%)"
                whiteSpace="nowrap"
                borderWidth={0}
              >
                Enlarged market analysis chart {getChartLabel(selectedImage.name)}
              </Text>
            )}
            <Flex 
              position="absolute" 
              top={4} 
              right={4} 
              zIndex={2}
            >
              <IconButton
                aria-label="Close enlarged chart"
                icon={<CloseIcon />}
                onClick={onClose}
                colorScheme="whiteAlpha"
                variant="ghost"
                size="lg"
                _focus={{ outline: 'none' }}
                _focusVisible={{
                  boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.95)',
                  outline: 'none',
                }}
              />
            </Flex>
            {hasCarouselControls && (
              <>
                <IconButton
                  aria-label="Show previous market analysis chart"
                  icon={<ChevronLeftIcon boxSize={8} />}
                  onClick={handlePreviousImage}
                  colorScheme="whiteAlpha"
                  variant="solid"
                  size="lg"
                  position="absolute"
                  left={{ base: 3, md: 6 }}
                  top="50%"
                  transform="translateY(-50%)"
                  zIndex={2}
                  _focus={{ outline: 'none' }}
                  _focusVisible={{
                    boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.95)',
                    outline: 'none',
                  }}
                />
                <IconButton
                  aria-label="Show next market analysis chart"
                  icon={<ChevronRightIcon boxSize={8} />}
                  onClick={handleNextImage}
                  colorScheme="whiteAlpha"
                  variant="solid"
                  size="lg"
                  position="absolute"
                  right={{ base: 3, md: 6 }}
                  top="50%"
                  transform="translateY(-50%)"
                  zIndex={2}
                  _focus={{ outline: 'none' }}
                  _focusVisible={{
                    boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.95)',
                    outline: 'none',
                  }}
                />
              </>
            )}
            {selectedImage && selectedImage.type === 'image' && (
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt || `Full-screen market analysis chart ${getChartLabel(selectedImage.name)}`}
                maxH="95vh"
                maxW="95vw"
                objectFit="contain"
                onClick={onClose}
                cursor="pointer"
                decoding="async"
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MarketUpdateGallery;
