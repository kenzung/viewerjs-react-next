import * as React from 'react';
import ReactDOM from 'react-dom';
import Viewerjs from 'viewerjs';
import { useUnmount, useMount } from 'react-use';
import ImageList from './ImageList';
import { CommonViewerJsProps } from './types';
import { eventEmitter, eventType } from './event';

export interface ViewerJsReactProps extends CommonViewerJsProps{
  customToolbar?: React.ReactElement;
  viewerjsOptions?: Viewer.Options;
  onInit?: () => void;
  onReady?: () => void;
  onShown?: () => void;
  onViewed?: () => void;
  onBeforeClose?: () => void;
  onAfterClose?: () => void;
}

export interface ImageDetail {
  index: number;
  image: HTMLImageElement;
  originalImage: HTMLImageElement;
}

export interface ViewerJsReactRef {
  getViewer:() => Viewerjs | undefined,
  getCurrentImageDetail: () => ImageDetail | undefined
}

export const ViewerJsReact = React.forwardRef<ViewerJsReactRef, ViewerJsReactProps>(({
  customImageListComponent,
  customToolbar,
  imageUrls = [],
  showImageList,
  imageListClassname,
  viewerjsOptions = {},
  thumbnailsUrl = imageUrls,
  onInit,
  onReady,
  onShown,
  onViewed,
  onBeforeClose,
  onAfterClose,
}, ref) => {
  const viewer = React.useRef<Viewerjs>();

  const currentImageDetail = React.useRef<ImageDetail>();

  const imageListRef = React.useRef<{
    getInnerRef:() => HTMLUListElement | null, getMountState:() => boolean
  }>({ getInnerRef: () => null, getMountState: () => false });

  const renderCustomToolbar = React.useRef<boolean>(false);

  React.useEffect(() => {
    eventEmitter.addListener(eventType.ready, () => {
      if (customToolbar && !renderCustomToolbar.current && viewer.current) {
        const viewContainer = document.querySelector('.viewer-container');
        if (viewContainer) {
          const divContainer = document.createElement('div');
          ReactDOM.render(customToolbar, viewContainer.appendChild(divContainer));
          renderCustomToolbar.current = true;
        }
      }
    });
  }, [customToolbar]);

  React.useImperativeHandle(ref, () => ({
    getViewer: () => viewer.current,
    getCurrentImageDetail: () => currentImageDetail.current,
  }));

  React.useEffect(() => {
    const flag = imageUrls.some((url) => !!url);
    if (viewer.current && flag) {
      viewer.current.update();
    }
  }, [
    imageUrls,
  ]);

  useMount(() => {
    if (imageListRef.current.getMountState()) {
      const innerRef = imageListRef.current.getInnerRef();
      if (innerRef) {
        if (onBeforeClose) {
          innerRef.addEventListener('hide', () => {
            onBeforeClose();
          });
        }
        if (onAfterClose) {
          innerRef.addEventListener('hidden', () => {
            onAfterClose();
          });
        }
        innerRef.addEventListener('view', (event: any) => {
          if (event && event.detail) {
            currentImageDetail.current = event.detail;
          }
        });
        viewer.current = new Viewerjs(innerRef, {
          toolbar: !customToolbar,
          ...viewerjsOptions,
          ready() {
            eventEmitter.emit(eventType.ready);
            if (onReady) {
              onReady();
            }
          },
          shown() {
            if (onShown) {
              onShown();
            }
          },
          viewed() {
            if (onViewed) {
              onViewed();
            }
          },
          url(image: HTMLImageElement) {
            return image.dataset.src;
          },
        });
        if (onInit) {
          onInit();
        }
      }
    }
  });

  useUnmount(() => {
    if (viewer.current) {
      viewer.current.destroy();
      eventEmitter.removeAllListeners();
    }
  });

  return (
    <ImageList
      ref={imageListRef}
      imageUrls={imageUrls}
      thumbnailsUrl={thumbnailsUrl}
      showImageList={!!showImageList}
      imageListClassname={imageListClassname}
      customImageListComponent={customImageListComponent}
    />
  );
});

ViewerJsReact.displayName = 'ViewerJsReact';
export default React.memo(ViewerJsReact);
